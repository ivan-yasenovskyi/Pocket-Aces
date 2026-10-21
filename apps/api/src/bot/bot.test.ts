import assert from "node:assert/strict";
import { test } from "node:test";
import type { Update, User } from "grammy/types";
import { createBot } from "./bot.ts";
import { tick } from "./scheduler.ts";
import { memoryStore, type Training } from "../storage.ts";
import { statText } from "./texts.ts";

const GROUP = -100123;
const ADMIN: User = { id: 1, is_bot: false, first_name: "Іван", last_name: "Ясеновський" };
const ANNA: User = { id: 2, is_bot: false, first_name: "Kornienko" };
const OLEH: User = { id: 3, is_bot: false, first_name: "Mykytyn" };
const SILENT: User = { id: 4, is_bot: false, first_name: "Shevchenko" };

function setup() {
  const store = memoryStore();
  const bot = createBot("123:TEST", store, { botInfo: {
    id: 999, is_bot: true, first_name: "PA Bot", username: "pa_test_bot",
    can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false,
    can_connect_to_business: false, has_main_web_app: false,
  } as never });

  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  let pollCounter = 0;
  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    calls.push({ method, payload: p });
    if (method === "sendPoll") {
      pollCounter += 1;
      return { ok: true, result: { message_id: 500 + pollCounter, date: 0, chat: { id: GROUP, type: "supergroup", title: "PA" }, poll: { id: `poll-${pollCounter}` } } } as never;
    }
    if (method === "getChatMember") {
      return { ok: true, result: { status: p.user_id === ADMIN.id ? "administrator" : "member", user: {} } } as never;
    }
    return { ok: true, result: { message_id: 1, date: 0, chat: { id: GROUP } } } as never;
  });

  let updateId = 0;
  const command = (from: User, text: string) => {
    const name = text.split(" ")[0];
    const update: Update = {
      update_id: ++updateId,
      message: {
        message_id: updateId, date: 0, from, text,
        chat: { id: GROUP, type: "supergroup", title: "PA" },
        entities: [{ type: "bot_command", offset: 0, length: name.length }],
      },
    } as Update;
    return bot.handleUpdate(update);
  };
  const vote = (user: User, pollId: string, option: number | null) =>
    bot.handleUpdate({ update_id: ++updateId, poll_answer: { poll_id: pollId, user, option_ids: option === null ? [] : [option] } } as Update);

  const texts = () => calls.filter((c) => c.method === "sendMessage").map((c) => String(c.payload.text));
  return { bot, store, calls, command, vote, texts };
}

function dayAfterTomorrow(): string {
  const d = new Date(Date.now() + 2 * 24 * 3600_000);
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get("day")}.${get("month")}`;
}

function weekdayInThreeDays(): string {
  const names = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Warsaw", weekday: "short" })
    .format(new Date(Date.now() + 3 * 24 * 3600_000));
  return names[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday)];
}

test("повний сценарій у групі", async () => {
  const { store, calls, command, vote, texts } = setup();

  await command(ANNA, "/start");
  assert.match(texts().at(-1)!, /лише адміністратор/);
  assert.equal(store.data.chatId, null);

  await command(ADMIN, "/start@pa_test_bot");
  assert.equal(store.data.chatId, GROUP);
  assert.match(texts().at(-1)!, /Готово/);

  await command(ANNA, `/trening ${dayAfterTomorrow()} 19:00 Hala`);
  assert.match(texts().at(-1)!, /лише адміністратор/);

  await command(ADMIN, `/trening ${dayAfterTomorrow()} 19:00 Hala Sportowa`);
  const poll = calls.filter((c) => c.method === "sendPoll").at(-1)!;
  assert.match(String(poll.payload.question), /^🏐 Тренування: .+ о 19:00 · Hala Sportowa$/);
  assert.equal(poll.payload.is_anonymous, false);
  assert.equal(store.data.trainings.length, 1);

  await command(ADMIN, `/trening ${dayAfterTomorrow()} 19:00`);
  assert.match(texts().at(-1)!, /вже є/);
  assert.equal(store.data.trainings.length, 1);

  await command(SILENT, "/help");

  await vote(ADMIN, "poll-1", 0);
  await vote(ANNA, "poll-1", 1);
  await vote(OLEH, "poll-1", 2);
  await vote(OLEH, "poll-1", null);
  await vote(OLEH, "poll-1", 0);

  await command(ANNA, "/hto");
  const hto = texts().at(-1)!;
  assert.match(hto, /✅ Будуть \(2\): Іван Ясеновський, Mykytyn/);
  assert.match(hto, /❌ Не будуть \(1\): Kornienko/);
  assert.match(hto, /🤔 Під питанням \(0\): —/);
  assert.match(hto, /⏳ Ще не відповіли \(1\): Shevchenko/);

  const start = new Date(store.data.trainings[0].startsAt).getTime();

  await command(ADMIN, "/rozklad");
  assert.match(texts().at(-1)!, /✅ 2 · 🤔 0 · ❌ 1/);

  await command(ADMIN, `/rozklad_dodaty ${weekdayInThreeDays()} 20:30 Hala B`);
  assert.equal(store.data.slots.length, 1);
  await command(ADMIN, "/rozklad_vydalyty 1");
  assert.equal(store.data.slots.length, 0);

  await command(ADMIN, "/skasuvaty");
  assert.equal(store.data.trainings[0].cancelled, true);
  assert.ok(calls.some((c) => c.method === "stopPoll"));
  assert.match(texts().at(-1)!, /скасовано/);
  assert.ok(start > Date.now());
});

test("розклад: опитування за добу, нагадування за 3 години, закриття на старті", async () => {
  const { bot, store, calls } = setup();
  store.data.chatId = GROUP;
  store.data.slots.push({ weekday: 2, hour: 19, minute: 0, place: "Hala" });
  store.data.members["2"] = { id: 2, name: "Kornienko" };

  const start = new Date("2026-10-27T18:00:00Z");
  const at = (hoursBefore: number) => new Date(start.getTime() - hoursBefore * 3600_000);

  await tick(bot.api, store, at(30));
  assert.equal(calls.filter((c) => c.method === "sendPoll").length, 0);

  await tick(bot.api, store, at(24));
  await tick(bot.api, store, at(23.9));
  const polls = calls.filter((c) => c.method === "sendPoll");
  assert.equal(polls.length, 1);
  assert.equal(polls[0].payload.question, "🏐 Тренування: вт, 27.10 о 19:00 · Hala");

  await tick(bot.api, store, at(3));
  const reminder = calls.filter((c) => c.method === "sendMessage");
  assert.equal(reminder.length, 1);
  assert.match(String(reminder[0].payload.text), /Нагадування/);
  assert.match(String(reminder[0].payload.text), /Ще не відповіли \(1\): Kornienko/);

  await tick(bot.api, store, at(2));
  assert.equal(calls.filter((c) => c.method === "sendMessage").length, 1);

  await tick(bot.api, store, at(0));
  assert.equal(calls.filter((c) => c.method === "stopPoll").length, 1);
  assert.equal(store.data.trainings[0].closed, true);
});

test("статистика", () => {
  const { store } = setup();
  const data = store.data;
  data.chatId = GROUP;
  data.members = { "1": { id: 1, name: "Іван" }, "2": { id: 2, name: "Kornienko" } };
  const base = { chatId: GROUP, place: "", source: "manual" as const, pollId: "p", messageId: 1, cancelled: false, reminded: true, closed: true };
  const trainings: Training[] = [
    { ...base, id: "a", startsAt: "2026-10-01T17:00:00.000Z", votes: { "1": "yes" as const, "2": "no" as const } },
    { ...base, id: "b", startsAt: "2026-10-08T17:00:00.000Z", votes: { "1": "yes" as const } },
  ];
  const text = statText(data, trainings);
  assert.match(text, /тренувань: 2/);
  assert.match(text, /Іван — ✅ 2 · 🤔 0 · ❌ 0 · ⏳ 0\nKornienko — ✅ 0 · 🤔 0 · ❌ 1 · ⏳ 1/);
});
