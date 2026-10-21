import type { Api } from "grammy";
import {
  ANNOUNCE_HOURS_BEFORE,
  MATCH_ANNOUNCE_HOUR,
  MATCH_ANNOUNCE_WEEKDAY,
  MATCH_DAY_BEFORE_HOUR,
  REMIND_HOURS_BEFORE,
} from "../config.ts";
import type { Data, Match, Slot, Store, Training } from "../storage.ts";
import { POLL_OPTIONS, attendanceText, matchPollQuestion, pollQuestion } from "./texts.ts";
import { addDays, weekdayOf, zonedDate, zonedParts } from "../time.ts";

const HOUR = 3600_000;

export interface Occurrence {
  startsAt: Date;
  place: string;
}

export function upcomingOccurrences(slots: Slot[], now: Date, days = 8): Occurrence[] {
  const today = zonedParts(now);
  const result: Occurrence[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = addDays(today, i);
    const weekday = weekdayOf(day);
    for (const slot of slots) {
      if (slot.weekday !== weekday) continue;
      const startsAt = zonedDate(day.year, day.month, day.day, slot.hour, slot.minute);
      if (startsAt.getTime() > now.getTime()) result.push({ startsAt, place: slot.place });
    }
  }
  return result.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function teamTrainings(data: Data): Training[] {
  return data.trainings
    .filter((t) => t.chatId === data.chatId && !t.cancelled)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function nextTraining(data: Data, now: Date): Training | undefined {
  return teamTrainings(data).find((t) => new Date(t.startsAt).getTime() > now.getTime() - 2 * HOUR);
}

export function findTraining(data: Data, startsAt: Date): Training | undefined {
  const iso = startsAt.toISOString();
  return data.trainings.find((t) => t.chatId === data.chatId && t.startsAt === iso);
}

export async function announce(
  api: Api,
  store: Store,
  input: { startsAt: Date; place: string; source: Training["source"] },
  now: Date,
): Promise<Training> {
  const chatId = store.data.chatId;
  if (chatId === null) throw new Error("Бот ще не підключений до групи");

  const message = await api.sendPoll(
    chatId,
    pollQuestion(input.startsAt, input.place),
    POLL_OPTIONS.map((option) => ({ text: option.text })),
    { is_anonymous: false, allows_multiple_answers: false },
  );

  const startsAtMs = input.startsAt.getTime();
  const training: Training = {
    id: `${chatId}:${input.startsAt.toISOString()}`,
    chatId,
    startsAt: input.startsAt.toISOString(),
    place: input.place,
    source: input.source,
    pollId: message.poll.id,
    messageId: message.message_id,
    votes: {},
    cancelled: false,
    reminded: now.getTime() >= startsAtMs - REMIND_HOURS_BEFORE * HOUR,
    closed: false,
  };
  store.data.trainings.push(training);
  await store.save();
  return training;
}

export async function closePoll(api: Api, training: Training): Promise<void> {
  try {
    await api.stopPoll(training.chatId, training.messageId);
  } catch {
  }
}

export function matchAnnounceAt(startsAt: Date): Date {
  const matchDay = zonedParts(startsAt);
  for (let back = 0; back <= 7; back += 1) {
    const day = addDays(matchDay, -back);
    if (weekdayOf(day) !== MATCH_ANNOUNCE_WEEKDAY) continue;
    const at = zonedDate(day.year, day.month, day.day, MATCH_ANNOUNCE_HOUR, 0);
    if (at.getTime() < startsAt.getTime()) return at;
  }
  return new Date(startsAt.getTime() - 48 * HOUR);
}

export function matchDayBeforeAt(startsAt: Date): Date {
  const day = addDays(zonedParts(startsAt), -1);
  return zonedDate(day.year, day.month, day.day, MATCH_DAY_BEFORE_HOUR, 0);
}

export async function announceMatch(api: Api, store: Store, match: Match, now: Date): Promise<void> {
  const chatId = store.data.chatId;
  if (chatId === null) throw new Error("Бот ще не підключений до групи");

  const message = await api.sendPoll(
    chatId,
    matchPollQuestion(match),
    POLL_OPTIONS.map((option) => ({ text: option.text })),
    { is_anonymous: false, allows_multiple_answers: false },
  );
  match.poll = {
    chatId,
    pollId: message.poll.id,
    messageId: message.message_id,
    votes: {},
    reminded: now.getTime() >= new Date(match.startsAt).getTime() - REMIND_HOURS_BEFORE * HOUR,
    closed: false,
  };
  await store.save();
}

async function tickMatches(api: Api, store: Store, now: Date): Promise<void> {
  const data = store.data;
  for (const match of data.matches) {
    const start = new Date(match.startsAt).getTime();
    const poll = match.poll;

    if (!poll) {
      if (now.getTime() < start && now.getTime() >= matchAnnounceAt(new Date(match.startsAt)).getTime()) {
        await announceMatch(api, store, match, now);
      }
      continue;
    }
    if (poll.chatId !== data.chatId) continue;

    const remindAt = start - REMIND_HOURS_BEFORE * HOUR;
    if (!poll.remindedDayBefore && !poll.reminded && now.getTime() >= matchDayBeforeAt(new Date(match.startsAt)).getTime() && now.getTime() < remindAt) {
      const title = `📅 Завтра матч проти ${match.opponent}! Хто ще не відповів — відміться в опитуванні.`;
      await api.sendMessage(poll.chatId, attendanceText({ ...match, votes: poll.votes }, data, title), {
        parse_mode: "HTML",
        reply_parameters: { message_id: poll.messageId, allow_sending_without_reply: true },
      });
      poll.remindedDayBefore = true;
      await store.save();
    }

    if (!poll.reminded && now.getTime() >= start - REMIND_HOURS_BEFORE * HOUR && now.getTime() < start) {
      const title = `⏰ Матч проти ${match.opponent}:`;
      await api.sendMessage(poll.chatId, attendanceText({ ...match, votes: poll.votes }, data, title), {
        parse_mode: "HTML",
        reply_parameters: { message_id: poll.messageId, allow_sending_without_reply: true },
      });
      poll.reminded = true;
      await store.save();
    }

    if (!poll.closed && now.getTime() >= start) {
      try {
        await api.stopPoll(poll.chatId, poll.messageId);
      } catch {
      }
      poll.closed = true;
      await store.save();
    }
  }
}

export async function tick(api: Api, store: Store, now: Date): Promise<void> {
  const data = store.data;
  if (data.chatId === null) return;

  await tickMatches(api, store, now);

  for (const occurrence of upcomingOccurrences(data.slots, now)) {
    const announceAt = occurrence.startsAt.getTime() - ANNOUNCE_HOURS_BEFORE * HOUR;
    if (now.getTime() < announceAt) continue;
    if (findTraining(data, occurrence.startsAt)) continue;
    await announce(api, store, { ...occurrence, source: "schedule" }, now);
  }

  for (const training of data.trainings) {
    if (training.chatId !== data.chatId || training.cancelled) continue;
    const start = new Date(training.startsAt).getTime();

    if (!training.reminded && now.getTime() >= start - REMIND_HOURS_BEFORE * HOUR && now.getTime() < start) {
      await api.sendMessage(training.chatId, attendanceText(training, data, "⏰ Нагадування:"), {
        parse_mode: "HTML",
        reply_parameters: { message_id: training.messageId, allow_sending_without_reply: true },
      });
      training.reminded = true;
      await store.save();
    }

    if (!training.closed && now.getTime() >= start) {
      await closePoll(api, training);
      training.closed = true;
      await store.save();
    }
  }
}
