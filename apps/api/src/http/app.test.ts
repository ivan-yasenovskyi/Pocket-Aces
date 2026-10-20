import assert from "node:assert/strict";
import { test } from "node:test";
import type { Update, User } from "grammy/types";
import { createBot } from "../bot/bot.ts";
import { memoryStore } from "../storage.ts";
import { createApp } from "./app.ts";

const GROUP = -1001234567890;
const IVAN: User = { id: 11, is_bot: false, first_name: "Ivan", last_name: "Yasenovskyi", username: "ivan" };
const OLEH: User = { id: 13, is_bot: false, first_name: "Mykytyn" };
const STRANGER: User = { id: 99, is_bot: false, first_name: "Stranger" };

function setup() {
  const store = memoryStore();
  store.data.chatId = GROUP;
  let clock = new Date("2026-10-20T10:00:00Z");
  const statuses = new Map<number, string>([[IVAN.id, "member"], [OLEH.id, "administrator"]]);
  const replies: string[] = [];

  const bot = createBot("123:TEST", store, {
    botInfo: { id: 999, is_bot: true, first_name: "PA Bot", username: "pa_test_bot" } as never,
    now: () => clock,
  });
  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    if (method === "getChatMember") {
      return { ok: true, result: { status: statuses.get(Number(p.user_id)) ?? "left", user: {} } } as never;
    }
    if (method === "sendMessage") replies.push(String(p.text));
    return { ok: true, result: { message_id: 1, date: 0, chat: { id: Number(p.chat_id) } } } as never;
  });

  const app = createApp({ store, api: bot.api, botUsername: "pa_test_bot", secureCookies: false, now: () => clock });

  let updateId = 0;
  const privateStart = (from: User, payload: string) =>
    bot.handleUpdate({
      update_id: ++updateId,
      message: {
        message_id: updateId, date: 0, from, text: `/start ${payload}`,
        chat: { id: from.id, type: "private", first_name: from.first_name },
        entities: [{ type: "bot_command", offset: 0, length: 6 }],
      },
    } as Update);

  function browser() {
    const jar = new Map<string, string>();
    return async (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (jar.size) headers.set("cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
      if (init.body) headers.set("content-type", "application/json");
      const res = await app.request(path, { ...init, headers });
      for (const line of res.headers.getSetCookie()) {
        const [pair] = line.split(";");
        const [name, value] = pair.split("=");
        if (/Max-Age=0/i.test(line) || value === "") jar.delete(name);
        else jar.set(name, value);
      }
      return { status: res.status, json: (await res.json()) as Record<string, any>, setCookie: res.headers.getSetCookie() };
    };
  }

  async function login(user: User, b = browser()) {
    const start = await b("/api/auth/telegram", { method: "POST", body: "{}" });
    const token = String(start.json.token);
    await privateStart(user, `login_${token}`);
    const result = await b(`/api/auth/telegram/${token}`);
    return { b, token, start, result };
  }

  return { store, app, statuses, replies, privateStart, browser, login, setClock: (d: Date) => (clock = d) };
}

test("вхід через Telegram: гравець у групі", async () => {
  const { login, replies, browser, store } = setup();
  const b = browser();

  const pending = await b("/api/auth/telegram", { method: "POST", body: "{}" });
  assert.match(String(pending.json.link), /^https:\/\/t\.me\/pa_test_bot\?start=login_[\w-]{22}$/);
  assert.ok(pending.setCookie.some((c) => c.startsWith("pa_login=") && /HttpOnly/.test(c) && /SameSite=Lax/.test(c)));
  assert.deepEqual((await b(`/api/auth/telegram/${pending.json.token}`)).json, { status: "pending" });

  const { b: b2, result } = await login(IVAN);
  assert.equal(result.json.status, "ok");
  assert.match(replies.at(-1)!, /Вхід підтверджено/);
  assert.ok(result.setCookie.some((c) => c.startsWith("pa_session=") && /HttpOnly/.test(c)));
  assert.ok(!store.data.sessions[0].idHash.includes(result.setCookie[0].split("=")[1]));

  const me = await b2("/api/me");
  assert.equal(me.status, 200);
  assert.equal(me.json.user.name, "Ivan Yasenovskyi");
  assert.equal(me.json.playerNumber, null);
});

test("токен не можна використати з іншого браузера", async () => {
  const { browser, privateStart } = setup();
  const mine = browser();
  const start = await mine("/api/auth/telegram", { method: "POST", body: "{}" });
  await privateStart(IVAN, `login_${start.json.token}`);
  const thief = browser();
  assert.deepEqual((await thief(`/api/auth/telegram/${start.json.token}`)).json, { status: "expired" });
  assert.equal((await mine(`/api/auth/telegram/${start.json.token}`)).json.status, "ok");
});

test("не в групі — вхід заборонено", async () => {
  const { login, replies } = setup();
  const { result, b } = await login(STRANGER);
  assert.equal(result.json.status, "denied");
  assert.match(replies.at(-1)!, /немає в групі/);
  assert.equal((await b("/api/me")).status, 401);
});

test("застарілий токен", async () => {
  const { browser, privateStart, replies, setClock } = setup();
  const b = browser();
  const start = await b("/api/auth/telegram", { method: "POST", body: "{}" });
  setClock(new Date("2026-10-20T10:11:00Z"));
  await privateStart(IVAN, `login_${start.json.token}`);
  assert.match(replies.at(-1)!, /застаріло/);
  assert.equal((await b(`/api/auth/telegram/${start.json.token}`)).json.status, "expired");
});

test("картка гравця, відповідь на тренування, вихід із групи", async () => {
  const { login, store, statuses, setClock } = setup();
  store.data.trainings.push({
    id: `${GROUP}:2026-10-22T17:00:00.000Z`, chatId: GROUP, startsAt: "2026-10-22T17:00:00.000Z", place: "Hala",
    source: "schedule", pollId: "p1", messageId: 77, votes: { "13": "yes" }, cancelled: false, reminded: false, closed: false,
  });
  store.data.trainings.push({
    id: `${GROUP}:2026-10-15T17:00:00.000Z`, chatId: GROUP, startsAt: "2026-10-15T17:00:00.000Z", place: "Hala",
    source: "schedule", pollId: "p0", messageId: 70, votes: { "11": "yes" }, cancelled: false, reminded: true, closed: true,
  });
  store.data.members["13"] = { id: 13, name: "Mykytyn" };

  const ivan = (await login(IVAN)).b;
  const oleh = (await login(OLEH)).b;

  assert.equal((await ivan("/api/me/player", { method: "POST", body: JSON.stringify({ number: "11" }) })).json.playerNumber, "11");
  assert.equal((await oleh("/api/me/player", { method: "POST", body: JSON.stringify({ number: "11" }) })).status, 409);
  assert.equal((await ivan("/api/me/player", { method: "POST", body: JSON.stringify({ number: "10" }) })).json.error, "already_linked");
  assert.deepEqual((await oleh("/api/me")).json.takenNumbers, ["11"]);

  const me = await ivan("/api/me");
  assert.equal(me.json.nextTraining.myAnswer, null);
  assert.equal(me.json.nextTraining.pollUrl, "https://t.me/c/1234567890/77");
  assert.deepEqual(me.json.attendance, { items: [{ startsAt: "2026-10-15T17:00:00.000Z", answer: "yes" }], present: 1, total: 1 });

  const id = encodeURIComponent(me.json.nextTraining.id);
  const yes = await ivan(`/api/trainings/${id}/answer`, { method: "POST", body: JSON.stringify({ answer: "yes" }) });
  assert.equal(yes.json.nextTraining.myAnswer, "yes");
  assert.deepEqual(yes.json.nextTraining.going, ["Ivan Yasenovskyi", "Mykytyn"]);
  assert.equal(store.data.trainings[0].votes["11"], "yes");

  const raw = await ivan(`/api/trainings/${id}/answer`, { method: "POST" });
  assert.equal(raw.status, 415);

  statuses.set(IVAN.id, "left");
  setClock(new Date("2026-10-20T10:05:00Z"));
  assert.equal((await ivan("/api/me")).status, 200);
  setClock(new Date("2026-10-20T10:20:00Z"));
  assert.equal((await ivan("/api/me")).status, 401);
  assert.equal(store.data.sessions.some((s) => s.telegramId === IVAN.id), false);
});

test("вихід із сайту", async () => {
  const { login } = setup();
  const { b } = await login(IVAN);
  assert.equal((await b("/api/me")).status, 200);
  await b("/api/auth/logout", { method: "POST", body: "{}" });
  assert.equal((await b("/api/me")).status, 401);
});
