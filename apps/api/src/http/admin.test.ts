import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Update, User } from "grammy/types";
import { createBot } from "../bot/bot.ts";
import { matchDayBeforeAt, tick } from "../bot/scheduler.ts";
import { drawGroups, gameWinner, groupTable, roundRobin } from "../cup.ts";
import { decodeTable, parseStandings } from "../league.ts";
import { memoryStore } from "../storage.ts";
import { createApp } from "./app.ts";

const GROUP = -1001234567890;
const CAPTAIN: User = { id: 1, is_bot: false, first_name: "Captain" };
const PLAYER: User = { id: 2, is_bot: false, first_name: "Player" };

async function setup() {
  const store = memoryStore();
  store.data.chatId = GROUP;
  let clock = new Date("2026-10-20T10:00:00Z");
  const statuses = new Map<number, string>([[CAPTAIN.id, "administrator"], [PLAYER.id, "member"]]);
  const calls: { method: string; payload: Record<string, unknown> }[] = [];
  const bot = createBot("123:TEST", store, {
    botInfo: { id: 999, is_bot: true, first_name: "PA Bot", username: "pa_test_bot" } as never,
    now: () => clock,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    calls.push({ method, payload: p });
    if (method === "getChatMember") {
      return { ok: true, result: { status: statuses.get(Number(p.user_id)) ?? "left", user: {} } } as never;
    }
    return { ok: true, result: { message_id: 1, date: 0, chat: { id: Number(p.chat_id) } } } as never;
  });

  const photoDir = await mkdtemp(join(tmpdir(), "pa-photos-"));
  const downloads: string[] = [];
  const app = createApp({
    store,
    api: bot.api,
    botUsername: "pa_test_bot",
    secureCookies: false,
    now: () => clock,
    photoDir,
    downloadFile: async (fileId) => {
      downloads.push(fileId);
      return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    },
  });

  const json = async (path: string, init: RequestInit = {}, cookie = "") => {
    const headers = new Headers(init.headers);
    if (init.body) headers.set("content-type", "application/json");
    if (cookie) headers.set("cookie", cookie);
    const res = await app.request(path, { ...init, headers });
    const type = res.headers.get("content-type") ?? "";
    const body = type.includes("json") ? ((await res.json()) as Record<string, any>) : await res.text();
    return { status: res.status, body: body as any, res };
  };
  const post = (path: string, body: unknown, cookie: string) => json(path, { method: "POST", body: JSON.stringify(body) }, cookie);

  let updateId = 0;
  const handle = (update: object) => bot.handleUpdate({ update_id: ++updateId, ...update } as Update);
  async function login(user: User): Promise<string> {
    const start = await json("/api/auth/telegram", { method: "POST", body: "{}" });
    const loginCookie = start.res.headers.getSetCookie()[0].split(";")[0];
    await handle({
      message: {
        message_id: 1, date: 0, from: user, text: `/start login_${start.body.token}`,
        chat: { id: user.id, type: "private", first_name: user.first_name },
        entities: [{ type: "bot_command", offset: 0, length: 6 }],
      },
    });
    const done = await json(`/api/auth/telegram/${start.body.token}`, {}, loginCookie);
    return done.res.headers.getSetCookie().find((c) => c.startsWith("pa_session="))!.split(";")[0];
  }

  return { store, bot, app, calls, json, post, handle, login, photoDir, downloads, setClock: (d: Date) => (clock = d) };
}

test("панель капітана: доступ лише для адміністраторів", async () => {
  const { json, login } = await setup();
  assert.equal((await json("/api/admin/overview")).status, 401);
  assert.equal((await json("/api/admin/overview", {}, await login(PLAYER))).status, 403);
  assert.equal((await json("/api/admin/overview", {}, await login(CAPTAIN))).status, 200);
});

test("панель капітана: матчі, рахунок, показники гравців", async () => {
  const { store, json, post, login } = await setup();
  const captain = await login(CAPTAIN);

  const bad = await post("/api/admin/matches", { date: "2026-11-02", time: "25:00", opponent: "AZS" }, captain);
  assert.equal(bad.status, 400);

  let overview = (await post("/api/admin/matches", { date: "2026-11-02", time: "18:00", opponent: "AZS Łódź", place: "Hala" }, captain)).body;
  assert.equal(overview.matches.length, 1);
  const id = overview.matches[0].id;
  assert.equal(overview.matches[0].startsAt, "2026-11-02T17:00:00.000Z");

  overview = (await post(`/api/admin/matches/${id}`, { result: { us: 3, them: 1 }, sets: [{ us: 25, them: 20 }, { us: 23, them: 25 }, { us: 25, them: 18 }, { us: 25, them: 22 }] }, captain)).body;
  assert.deepEqual(overview.matches[0].result, { us: 3, them: 1 });
  assert.equal(overview.matches[0].sets.length, 4);

  const lines = [
    { playerNumber: "11", points: 14, aces: 2, blocks: 1, serve: 88 },
    { playerNumber: "23", points: 8, aces: 0, blocks: 5, serve: null },
  ];
  assert.equal((await post(`/api/admin/matches/${id}/stats`, { lines: [...lines, lines[0]] }, captain)).status, 400);
  overview = (await post(`/api/admin/matches/${id}/stats`, { lines }, captain)).body;
  assert.deepEqual(overview.matches[0].stats, lines);

  const player = (await json("/api/players/11")).body;
  assert.deepEqual(player.totals, { points: 14, aces: 2, blocks: 1, matches: 1, serve: 88 });
  assert.equal(player.games[0].match.opponent, "AZS Łódź");
  const leaders = (await json("/api/leaderboard")).body;
  assert.deepEqual(leaders.points.map((l: { number: string }) => l.number), ["11", "23"]);
  assert.deepEqual(leaders.blocks[0], { number: "23", value: 5, matches: 1 });

  store.data.matches.push({ id: "league:4:x", startsAt: "2026-10-24T10:40:00.000Z", opponent: "X", place: "", result: null, source: "league" });
  assert.equal((await post("/api/admin/matches/league:4:x/delete", {}, captain)).status, 409);
  overview = (await post(`/api/admin/matches/${id}/delete`, {}, captain)).body;
  assert.deepEqual(overview.matches.map((m: { id: string }) => m.id), ["league:4:x"]);
  assert.equal(store.data.stats.length, 0);
});

test("турнір: налаштування, оплата, жеребкування груп і результати", async () => {
  const { store, json, post, login } = await setup();
  const captain = await login(CAPTAIN);

  await post("/api/admin/tournament", { name: "Pocket Aces Cup", date: "2027-04-10", place: "Rzgów", feePln: 400, maxTeams: 8, registrationOpen: true }, captain);
  const info = (await json("/api/tournament")).body;
  assert.equal(info.date, "2027-04-10");
  assert.equal(info.maxTeams, 8);

  for (let i = 1; i <= 7; i += 1) {
    const res = await post(
      "/api/tournament/registrations",
      { teamName: `Team ${i}`, city: "", level: "independent", captainName: "Jan Kowalski", email: `t${i}@x.pl`, phone: "600100200", instagram: "", consent: true },
      "",
    );
    assert.equal(res.status, 200);
  }
  const ids = store.data.registrations.map((r) => r.id);
  for (const id of ids.slice(0, 6)) await post(`/api/admin/registrations/${id}`, { status: "paid" }, captain);
  await post(`/api/admin/registrations/${ids[6]}`, { status: "rejected" }, captain);

  const after = (await json("/api/tournament")).body;
  assert.equal(after.confirmed, 6);
  assert.equal(after.registered, 6);
  assert.equal(after.spotsLeft, 2);

  assert.equal((await post("/api/admin/cup/draw", { groupCount: 4 }, captain)).status, 400);
  const drawn = (await post("/api/admin/cup/draw", { groupCount: 2 }, captain)).body;
  assert.equal(drawn.cup.groups.length, 2);
  assert.equal(drawn.cup.games.length, 6);

  const game = store.data.cup.games[0];
  await post(`/api/admin/cup/games/${game.id}`, { sets: [{ us: 25, them: 20 }, { us: 18, them: 25 }, { us: 15, them: 10 }], date: "2027-04-10", time: "10:00", court: "1" }, captain);
  const view = (await json("/api/tournament")).body.cup;
  const played = view.games.find((g: { id: string }) => g.id === game.id);
  assert.equal(played.winner, "home");
  assert.equal(played.court, "1");
  const group = view.groups.find((g: { name: string }) => g.name === game.group);
  assert.equal(group.table[0].points, 2);
  assert.equal(group.table.find((r: { played: number; points: number }) => r.played === 1 && r.points === 1).setsWon, 1);

  const playoff = await post("/api/admin/cup/games", { label: "Finał", home: ids[0], away: ids[1] }, captain);
  assert.equal(playoff.body.cup.games.filter((g: { stage: string }) => g.stage === "playoff").length, 1);
});

test("cup: кожен з кожним, переможець, таблиця", () => {
  const games = roundRobin(["a", "b", "c", "d"]);
  assert.equal(games.length, 6);
  const pairs = new Set(games.map(([x, y]) => [x, y].sort().join("")));
  assert.equal(pairs.size, 6);

  assert.equal(gameWinner([{ us: 25, them: 10 }, { us: 25, them: 10 }]), "home");
  assert.equal(gameWinner([{ us: 25, them: 10 }]), null);

  const cup = drawGroups(["a", "b", "c"], 1, () => 0.5);
  cup.games[0].sets = [{ us: 25, them: 20 }, { us: 25, them: 20 }];
  const table = groupTable(cup.groups[0], cup.games);
  assert.equal(table[0].team, cup.games[0].home);
  assert.equal(table[0].points, 3);
});

test("календар .ics", async () => {
  const { store, json } = await setup();
  store.data.matches.push({
    id: "league:4:lookap", startsAt: "2026-10-24T10:40:00.000Z", opponent: "LookAp Volley Team",
    place: "SP 205, ul. Dąbrówki 1 · sektor B", result: null, source: "league", round: 4, home: true,
  });
  const all = await json("/api/calendar/matches.ics");
  assert.equal(all.res.headers.get("content-type"), "text/calendar; charset=utf-8");
  assert.match(all.body, /BEGIN:VCALENDAR\r\n/);
  assert.match(all.body, /DTSTART:20261024T104000Z\r\nDTEND:20261024T124000Z/);
  assert.match(all.body, /LOCATION:SP 205\\, ul\. Dąbrówki 1 · sektor B/);
  assert.match(all.body, /SUMMARY:🏐 Pocket Aces – LookAp Volley Team/);
  assert.equal((await json("/api/calendar/match/league:4:lookap")).status, 200);
  assert.equal((await json("/api/calendar/trainings.ics")).status, 401);
});

test("фото з матчу: бот приймає /foto від адміна, сайт віддає файл", async () => {
  const { store, json, handle, calls, photoDir, downloads, setClock } = await setup();
  store.data.matches.push({ id: "m1", startsAt: "2026-10-17T09:05:00.000Z", opponent: "Grot Euforia I", place: "", result: { us: 3, them: 1 } });
  setClock(new Date("2026-10-20T10:00:00Z"));

  const photo = (from: User, caption?: string, album?: string) =>
    handle({
      message: {
        message_id: 5, date: 0, from, chat: { id: GROUP, type: "supergroup", title: "PA" },
        photo: [{ file_id: "small", file_unique_id: "s", width: 90, height: 60 }, { file_id: `big-${Math.random()}`, file_unique_id: "b", width: 1280, height: 853 }],
        ...(caption ? { caption } : {}),
        ...(album ? { media_group_id: album } : {}),
      },
    });

  await photo(PLAYER, "/foto");
  assert.equal(store.data.photos.length, 0);
  await photo(CAPTAIN);
  assert.equal(store.data.photos.length, 0);

  await photo(CAPTAIN, "/foto", "album-1");
  await photo(CAPTAIN, undefined, "album-1");
  assert.equal(store.data.photos.length, 2);
  assert.ok(store.data.photos.every((p) => p.matchId === "m1" && p.width === 1280));
  assert.match(String(calls.filter((c) => c.method === "sendMessage").at(-1)!.payload.text), /Фото додано до матчу проти Grot Euforia I/);

  const latest = (await json("/api/photos/latest")).body;
  assert.equal(latest.match.opponent, "Grot Euforia I");
  assert.equal(latest.photos.length, 2);

  const id = store.data.photos[0].id;
  const first = await json(`/api/photos/${id}`);
  assert.equal(first.res.headers.get("content-type"), "image/jpeg");
  await json(`/api/photos/${id}`);
  assert.equal(downloads.length, 1);
  assert.deepEqual(await readdir(photoDir), [`${id}.jpg`]);
  assert.deepEqual([...(await readFile(join(photoDir, `${id}.jpg`)))], [0xff, 0xd8, 0xff, 0xd9]);
});

test("нагадування напередодні матчу о 19:00", async () => {
  const { store, bot, calls } = await setup();
  store.data.members = { "1": { id: 1, name: "Captain" }, "2": { id: 2, name: "Player" } };
  store.data.matches.push({
    id: "league:4:lookap", startsAt: "2026-10-24T10:40:00.000Z", opponent: "LookAp Volley Team", place: "SP 205", result: null,
    source: "league", round: 4, home: true,
    poll: { chatId: GROUP, pollId: "p", messageId: 9, votes: { "1": "yes" }, reminded: false, closed: false },
  });
  assert.equal(matchDayBeforeAt(new Date("2026-10-24T10:40:00Z")).toISOString(), "2026-10-23T17:00:00.000Z");

  await tick(bot.api, store, new Date("2026-10-23T16:59:00Z"));
  assert.equal(calls.filter((c) => c.method === "sendMessage").length, 0);
  await tick(bot.api, store, new Date("2026-10-23T17:00:00Z"));
  await tick(bot.api, store, new Date("2026-10-23T18:00:00Z"));
  const sent = calls.filter((c) => c.method === "sendMessage");
  assert.equal(sent.length, 1);
  assert.match(String(sent[0].payload.text), /Завтра матч проти LookAp Volley Team[\s\S]*Ще не відповіли \(1\): Player/);
});

test("офіційна таблиця ліги з документа Word (UTF-16)", async () => {
  const bytes = new Uint8Array(await readFile(new URL("../fixtures/table-2026-10-20.htm", import.meta.url)));
  const rows = parseStandings(decodeTable(bytes));
  assert.equal(rows.length, 7);
  assert.deepEqual(rows[3], { position: 4, team: "Pocket Aces", matches: 1, points: 1, setsWon: 2, setsLost: 2 });
  assert.equal(rows[0].team, "Corona Volley");
});
