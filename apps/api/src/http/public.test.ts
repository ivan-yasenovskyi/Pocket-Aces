import assert from "node:assert/strict";
import { test } from "node:test";
import type { Update, User } from "grammy/types";
import { createBot } from "../bot/bot.ts";
import { memoryStore } from "../storage.ts";
import { TOURNAMENT } from "../tournament.ts";
import { createApp } from "./app.ts";

const GROUP = -1001234567890;
const CAPTAIN: User = { id: 1, is_bot: false, first_name: "Captain" };
const PLAYER: User = { id: 2, is_bot: false, first_name: "Player" };

function setup() {
  const store = memoryStore();
  store.data.chatId = GROUP;
  const clock = new Date("2026-10-20T10:00:00Z");
  const statuses = new Map<number, string>([[CAPTAIN.id, "administrator"], [PLAYER.id, "member"]]);
  const groupMessages: string[] = [];

  const bot = createBot("123:TEST", store, {
    botInfo: { id: 999, is_bot: true, first_name: "PA Bot", username: "pa_test_bot" } as never,
    now: () => clock,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    if (method === "getChatMember") {
      return { ok: true, result: { status: statuses.get(Number(p.user_id)) ?? "left", user: {} } } as never;
    }
    if (method === "sendMessage" && p.chat_id === GROUP) groupMessages.push(String(p.text));
    return { ok: true, result: { message_id: 1, date: 0, chat: { id: Number(p.chat_id) } } } as never;
  });
  const app = createApp({ store, api: bot.api, botUsername: "pa_test_bot", secureCookies: false, now: () => clock });

  const json = async (path: string, init: RequestInit = {}, cookie = "") => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("content-type", "application/json");
    if (cookie) headers.set("cookie", cookie);
    const res = await app.request(path, { ...init, headers });
    return { status: res.status, body: (await res.json()) as Record<string, any>, res };
  };

  let updateId = 0;
  async function login(user: User): Promise<string> {
    const start = await json("/api/auth/telegram", { method: "POST", body: "{}" });
    const loginCookie = start.res.headers.getSetCookie()[0].split(";")[0];
    await bot.handleUpdate({
      update_id: ++updateId,
      message: {
        message_id: updateId, date: 0, from: user, text: `/start login_${start.body.token}`,
        chat: { id: user.id, type: "private", first_name: user.first_name },
        entities: [{ type: "bot_command", offset: 0, length: 6 }],
      },
    } as Update);
    const done = await json(`/api/auth/telegram/${start.body.token}`, {}, loginCookie);
    return done.res.headers.getSetCookie().find((c) => c.startsWith("pa_session="))!.split(";")[0];
  }

  return { store, json, login, groupMessages };
}

const form = {
  teamName: "Siatka Team",
  city: "Łódź",
  level: "2nd",
  captainName: "Jan Kowalski",
  email: "Jan@Example.com",
  phone: "+48 600 100 200",
  instagram: "@siatka",
  consent: true,
};

test("публічні матчі й статистика", async () => {
  const { store, json } = setup();
  store.data.matches = [
    { id: "m1", startsAt: "2026-10-10T16:00:00.000Z", opponent: "AZS", place: "", result: { us: 3, them: 1 } },
    { id: "m2", startsAt: "2026-10-25T16:00:00.000Z", opponent: "Volley Łódź", place: "Hala", result: null },
  ];
  store.data.stats = [{ matchId: "m1", playerNumber: "11", points: 12, aces: 2, blocks: 1, serve: null }];

  const matches = await json("/api/matches");
  assert.deepEqual(matches.body.upcoming.map((m: { id: string }) => m.id), ["m2"]);
  assert.deepEqual(matches.body.recent[0].result, { us: 3, them: 1 });

  const stats = await json("/api/stats");
  assert.deepEqual(stats.body.stats["11"], { points: 12, aces: 2, blocks: 1, matches: 1, serve: null });
});

test("заявка на турнір", async () => {
  const { store, json, groupMessages } = setup();

  const info = await json("/api/tournament");
  assert.equal(info.body.spotsLeft, TOURNAMENT.maxTeams);
  assert.equal(info.body.feePln, 400);

  const bad = await json("/api/tournament/registrations", { method: "POST", body: JSON.stringify({ ...form, email: "nope" }) });
  assert.deepEqual(bad.body, { error: "invalid", field: "email" });
  const noConsent = await json("/api/tournament/registrations", { method: "POST", body: JSON.stringify({ ...form, consent: false }) });
  assert.equal(noConsent.body.field, "consent");

  const ok = await json("/api/tournament/registrations", { method: "POST", body: JSON.stringify(form) });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.registered, 1);
  assert.equal(ok.body.confirmed, 0);
  assert.deepEqual(ok.body.teams, []);
  assert.equal(store.data.registrations[0].status, "pending");
  assert.equal(store.data.registrations[0].email, "jan@example.com");
  assert.equal(store.data.registrations[0].instagram, "siatka");
  assert.match(groupMessages.at(-1)!, /Нова заявка на турнір \(1\/12\)[\s\S]*Siatka Team/);

  const sameTeam = await json("/api/tournament/registrations", { method: "POST", body: JSON.stringify({ ...form, email: "x@y.pl" }) });
  assert.deepEqual([sameTeam.status, sameTeam.body.error], [409, "team_taken"]);
  const sameEmail = await json("/api/tournament/registrations", { method: "POST", body: JSON.stringify({ ...form, teamName: "Inna" }) });
  assert.equal(sameEmail.body.error, "email_taken");

  await json("/api/tournament/registrations", { method: "POST", body: JSON.stringify({ ...form, teamName: "Spam", email: "s@s.pl", website: "http://spam" }) });
  assert.equal(store.data.registrations.length, 1);

  for (let i = store.data.registrations.length; i < TOURNAMENT.maxTeams; i += 1) {
    store.data.registrations.push({ ...store.data.registrations[0], id: `r${i}`, teamName: `T${i}`, email: `t${i}@x.pl` });
  }
  const full = await json("/api/tournament/registrations", { method: "POST", body: JSON.stringify({ ...form, teamName: "Late", email: "late@x.pl" }) });
  assert.deepEqual([full.status, full.body.error], [409, "full"]);
});

test("кабінет: капітан, найближчі тренування, відповідь «не знаю»", async () => {
  const { store, json, login } = setup();
  store.data.members = { "1": { id: 1, name: "Captain" }, "2": { id: 2, name: "Player" } };
  const training = (day: string, votes: Record<string, "yes" | "no" | "maybe">) => ({
    id: `${GROUP}:${day}`, chatId: GROUP, startsAt: day, place: "Hala", source: "schedule" as const,
    pollId: day, messageId: 1, votes, cancelled: false, reminded: true, closed: false,
  });
  store.data.trainings = [
    training("2026-10-13T17:00:00.000Z", { "1": "yes", "2": "yes" }),
    training("2026-10-15T17:00:00.000Z", { "1": "yes" }),
    training("2026-10-22T17:00:00.000Z", { "1": "yes" }),
    training("2026-10-27T18:00:00.000Z", {}),
  ];

  const player = await login(PLAYER);
  const me = await json("/api/me", {}, player);
  assert.equal(me.body.isCaptain, false);
  assert.equal(me.body.upcoming.length, 2);
  assert.equal((await json("/api/team/attendance", {}, player)).status, 403);

  const id = encodeURIComponent(me.body.upcoming[1].id);
  const maybe = await json(`/api/trainings/${id}/answer`, { method: "POST", body: JSON.stringify({ answer: "maybe" }) }, player);
  assert.equal(maybe.body.upcoming[1].myAnswer, "maybe");
  assert.equal(maybe.body.upcoming[1].counts.maybe, 1);

  const captain = await login(CAPTAIN);
  assert.equal((await json("/api/me", {}, captain)).body.isCaptain, true);
  const team = await json("/api/team/attendance", {}, captain);
  assert.deepEqual(team.body, {
    total: 2,
    nextStartsAt: "2026-10-22T17:00:00.000Z",
    rows: [
      { name: "Captain", playerNumber: null, present: 2, nextAnswer: "yes" },
      { name: "Player", playerNumber: null, present: 1, nextAnswer: null },
    ],
  });
});

test("склад на матч: лише капітан, без повторів", async () => {
  const { store, json, login } = setup();
  store.data.matches = [
    { id: "league:4:lookap", startsAt: "2026-10-24T10:40:00.000Z", opponent: "LookAp Volley Team", place: "SP 205", result: null },
  ];
  const lineup = { positions: { "1": "4", "2": "11", "3": "23", "4": "10", "5": "13", "6": "14" }, libero: "00" };
  const path = `/api/match/${encodeURIComponent("league:4:lookap")}/lineup`;

  const player = await login(PLAYER);
  assert.equal((await json(path, { method: "POST", body: JSON.stringify(lineup) }, player)).status, 403);

  const captain = await login(CAPTAIN);
  const twice = { ...lineup, libero: "11" };
  assert.equal((await json(path, { method: "POST", body: JSON.stringify(twice) }, captain)).body.error, "invalid_lineup");

  const saved = await json(path, { method: "POST", body: JSON.stringify(lineup) }, captain);
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.lineup, lineup);
  assert.deepEqual((await json("/api/match/current")).body.lineup, lineup);
});
