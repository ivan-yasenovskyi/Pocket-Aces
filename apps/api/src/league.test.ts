import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import type { Update, User } from "grammy/types";
import { createBot } from "./bot/bot.ts";
import { tick } from "./bot/scheduler.ts";
import { createApp } from "./http/app.ts";
import { applyLeague, leagueSyncDue, parseLeague, syncLeague, venue } from "./league.ts";
import { matchAnnounceAt } from "./bot/scheduler.ts";
import { memoryStore } from "./storage.ts";

const html = await readFile(new URL("./fixtures/league-2026-10-20.html", import.meta.url), "utf8");
const GROUP = -1001234567890;
const ADMIN: User = { id: 1, is_bot: false, first_name: "Kapitan" };

test("parseLeague читає тури, час, сектор, рахунок і партії", () => {
  const list = parseLeague(html);
  assert.ok(list.length >= 30);

  const first = list.find((m) => m.home === "Pocket Aces" && m.away === "RKS Volley")!;
  assert.equal(first.round, 1);
  assert.equal(first.startsAt!.toISOString(), "2026-10-03T12:35:00.000Z");
  assert.equal(first.sector, "B");
  assert.deepEqual(first.result, { us: 2, them: 2 });
  assert.deepEqual(first.sets, [
    { us: 25, them: 22 },
    { us: 19, them: 25 },
    { us: 23, them: 25 },
    { us: 25, them: 15 },
  ]);

  const next = list.find((m) => m.round === 4 && m.home === "Pocket Aces")!;
  assert.equal(next.away, "LookAp Volley Team");
  assert.equal(next.result, null);
  assert.deepEqual(next.sets, []);

  const unscheduled = list.find((m) => m.home === "Surchem-BeU" && m.round === 1)!;
  assert.equal(unscheduled.startsAt, null);
});

test("applyLeague бере лише наші матчі й рахує з нашого боку", () => {
  const store = memoryStore();
  const { added } = applyLeague(store.data, parseLeague(html));
  assert.ok(added.length >= 8);
  assert.ok(added.every((m) => m.source === "league"));

  const away = store.data.matches.find((m) => m.round === 3)!;
  assert.equal(away.opponent, "Grot Euforia I");
  assert.equal(away.home, false);
  assert.deepEqual(away.result, { us: 3, them: 1 });
  assert.deepEqual(away.sets?.[0], { us: 28, them: 26 });
  assert.equal(away.place, "SP 205, ul. Dąbrówki 1 · sektor C");

  const again = applyLeague(store.data, parseLeague(html));
  assert.deepEqual([again.added.length, again.moved.length], [0, 0]);
});

test("venue", () => {
  assert.equal(venue("B"), "SP 205, ul. Dąbrówki 1 · sektor B");
  assert.equal(venue("Hala 47 LO"), "Hala 47 LO, ul. Czernika 1/3");
  assert.equal(venue(""), "SP 205, ul. Dąbrówki 1");
});

function setup(now: Date) {
  const store = memoryStore();
  store.data.chatId = GROUP;
  let clock = now;
  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  let pollCounter = 0;
  const bot = createBot("123:TEST", store, {
    botInfo: { id: 999, is_bot: true, first_name: "PA Bot", username: "pa_test_bot" } as never,
    now: () => clock,
    loadLeague: async () => html,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    calls.push({ method, payload: p });
    if (method === "sendPoll") {
      pollCounter += 1;
      return { ok: true, result: { message_id: 700 + pollCounter, date: 0, chat: { id: GROUP }, poll: { id: `mpoll-${pollCounter}` } } } as never;
    }
    if (method === "getChatMember") {
      return { ok: true, result: { status: p.user_id === ADMIN.id ? "administrator" : "member", user: {} } } as never;
    }
    return { ok: true, result: { message_id: 1, date: 0, chat: { id: GROUP } } } as never;
  });
  let updateId = 0;
  const handle = (update: object) => bot.handleUpdate({ update_id: ++updateId, ...update } as Update);
  return { store, bot, calls, handle, setClock: (d: Date) => (clock = d) };
}

test("опитування перед матчем ліги: у четвер, нагадування, закриття, перенесення", async () => {
  const { store, bot, calls, handle, setClock } = setup(new Date("2026-10-18T10:00:00Z"));
  await syncLeague(bot.api, store, async () => html);

  await tick(bot.api, store, new Date("2026-10-20T10:00:00Z"));
  await tick(bot.api, store, new Date("2026-10-22T07:59:00Z"));
  assert.equal(calls.filter((c) => c.method === "sendPoll").length, 0);

  await tick(bot.api, store, new Date("2026-10-22T08:00:00Z"));
  const polls = calls.filter((c) => c.method === "sendPoll");
  assert.equal(polls.length, 1);
  assert.equal(
    polls[0].payload.question,
    "🏐 Матч (4 kolejka): Pocket Aces – LookAp Volley Team · сб, 24.10 о 12:40 · SP 205, ul. Dąbrówki 1 · sektor B. Хто грає?",
  );

  await handle({ poll_answer: { poll_id: "mpoll-1", user: ADMIN, option_ids: [0] } });
  const match = store.data.matches.find((m) => m.round === 4)!;
  assert.deepEqual(match.poll!.votes, { "1": "yes" });

  const moved = html.replace("2026-10-24 godz. 12.40, sektor B", "2026-10-24 godz. 15.50, sektor A");
  const changes = await syncLeague(bot.api, store, async () => moved);
  assert.equal(changes.moved.length, 1);
  const warning = calls.filter((c) => c.method === "sendMessage").at(-1)!;
  assert.match(String(warning.payload.text), /Зміна в terminarzu[\s\S]*о 12:40[\s\S]*о 15:50 · SP 205, ul\. Dąbrówki 1 · sektor A/);

  setClock(new Date("2026-10-24T11:00:00Z"));
  await tick(bot.api, store, new Date("2026-10-24T11:00:00Z"));
  assert.match(String(calls.filter((c) => c.method === "sendMessage").at(-1)!.payload.text), /Матч проти LookAp Volley Team[\s\S]*Будуть \(1\): Kapitan/);

  await tick(bot.api, store, new Date("2026-10-24T14:00:00Z"));
  assert.equal(match.poll!.closed, true);
  assert.equal(calls.filter((c) => c.method === "sendPoll").length, 1);
});

test("/liga і сторінка поточного матчу зі складом", async () => {
  const { store, bot, calls, handle } = setup(new Date("2026-10-20T10:00:00Z"));
  await handle({
    message: {
      message_id: 1, date: 0, from: ADMIN, text: "/liga",
      chat: { id: GROUP, type: "supergroup", title: "PA" },
      entities: [{ type: "bot_command", offset: 0, length: 5 }],
    },
  });
  assert.match(String(calls.filter((c) => c.method === "sendMessage").at(-1)!.payload.text), /нових матчів \d+[\s\S]*LookAp Volley Team/);
  assert.equal(calls.filter((c) => c.method === "sendPoll").length, 0);
  await tick(bot.api, store, new Date("2026-10-22T08:00:00Z"));
  assert.equal(calls.filter((c) => c.method === "sendPoll").length, 1);

  const app = createApp({ store, api: bot.api, botUsername: "pa_test_bot", secureCookies: false, now: () => new Date("2026-10-20T10:00:00Z") });
  store.data.links["1"] = "11";
  await handle({ poll_answer: { poll_id: "mpoll-1", user: ADMIN, option_ids: [0] } });

  const current = (await (await app.request("/api/match/current")).json()) as Record<string, any>;
  assert.equal(current.match.opponent, "LookAp Volley Team");
  assert.equal(current.match.round, 4);
  assert.deepEqual(current.going, ["11"]);
  assert.deepEqual(current.poll, { yes: 1, maybe: 0, no: 0 });
  assert.equal(current.lineup, null);

  const anonymous = await app.request(`/api/match/${encodeURIComponent(current.match.id)}/lineup`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ positions: { "1": "11" }, libero: null }),
  });
  assert.equal(anonymous.status, 401);
});

test("коли публікувати опитування і як часто перевіряти лігу", () => {
  assert.equal(matchAnnounceAt(new Date("2026-10-24T10:40:00Z")).toISOString(), "2026-10-22T08:00:00.000Z");
  assert.equal(matchAnnounceAt(new Date("2026-10-30T18:30:00Z")).toISOString(), "2026-10-29T09:00:00.000Z");
  assert.equal(matchAnnounceAt(new Date("2026-10-29T08:00:00Z")).toISOString(), "2026-10-22T08:00:00.000Z");

  const wednesday = new Date("2026-10-21T10:00:00Z");
  assert.equal(leagueSyncDue(wednesday, null), true);
  assert.equal(leagueSyncDue(wednesday, new Date("2026-10-21T09:50:00Z")), false);
  assert.equal(leagueSyncDue(wednesday, new Date("2026-10-21T09:45:00Z")), true);
  const tuesday = new Date("2026-10-20T10:00:00Z");
  assert.equal(leagueSyncDue(tuesday, new Date("2026-10-20T09:30:00Z")), false);
  assert.equal(leagueSyncDue(tuesday, new Date("2026-10-20T09:00:00Z")), true);
});
