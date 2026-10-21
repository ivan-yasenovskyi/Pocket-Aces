import assert from "node:assert/strict";
import { test } from "node:test";
import type { Update, User } from "grammy/types";
import { seasonStats } from "../matches.ts";
import { memoryStore } from "../storage.ts";
import { createBot } from "./bot.ts";
import { parseMatch, parseScore, parseStatLine } from "./parse.ts";

const GROUP = -100123;
const ADMIN: User = { id: 1, is_bot: false, first_name: "Іван" };
const PLAYER: User = { id: 2, is_bot: false, first_name: "Kornienko" };

function setup() {
  const store = memoryStore();
  store.data.chatId = GROUP;
  let clock = new Date("2026-10-20T10:00:00Z");
  const bot = createBot("123:TEST", store, {
    botInfo: { id: 999, is_bot: true, first_name: "PA Bot", username: "pa_test_bot" } as never,
    now: () => clock,
  });
  const replies: string[] = [];
  bot.api.config.use(async (_prev, method, payload) => {
    const p = payload as Record<string, unknown>;
    if (method === "getChatMember") {
      return { ok: true, result: { status: p.user_id === ADMIN.id ? "administrator" : "member", user: {} } } as never;
    }
    if (method === "sendMessage") replies.push(String(p.text));
    return { ok: true, result: { message_id: 1, date: 0, chat: { id: GROUP } } } as never;
  });

  let updateId = 0;
  const command = (from: User, text: string) =>
    bot.handleUpdate({
      update_id: ++updateId,
      message: {
        message_id: updateId, date: 0, from, text,
        chat: { id: GROUP, type: "supergroup", title: "PA" },
        entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0].length }],
      },
    } as Update);

  return { store, replies, command, setClock: (d: Date) => (clock = d) };
}

test("parseMatch, parseScore, parseStatLine", () => {
  const now = new Date("2026-10-20T10:00:00Z");
  const match = parseMatch("02.11 18:00 Volley Łódź | Hala MOSiR", now);
  assert.ok(!("error" in match));
  assert.equal(match.startsAt.toISOString(), "2026-11-02T17:00:00.000Z");
  assert.equal(match.opponent, "Volley Łódź");
  assert.equal(match.place, "Hala MOSiR");
  assert.ok("error" in parseMatch("02.11 18:00", now));

  assert.deepEqual(parseScore("3:1"), { us: 3, them: 1 });
  assert.deepEqual(parseScore("2 - 3"), { us: 2, them: 3 });
  assert.equal(parseScore("3:"), null);

  assert.deepEqual(parseStatLine("11 12 2 1 87"), { playerNumber: "11", points: 12, aces: 2, blocks: 1, serve: 87 });
  assert.deepEqual(parseStatLine("00 4 0 3"), { playerNumber: "00", points: 4, aces: 0, blocks: 3, serve: null });
  assert.ok("error" in parseStatLine("11 12 2 1 140"));
  assert.ok("error" in parseStatLine("11 дванадцять"));
});

test("матч: додати, рахунок, показники, видалити", async () => {
  const { store, replies, command, setClock } = setup();

  await command(PLAYER, "/match 02.11 18:00 Volley Łódź");
  assert.match(replies.at(-1)!, /лише адміністратор/);
  assert.equal(store.data.matches.length, 0);

  await command(ADMIN, "/match 02.11 18:00 Volley Łódź | Hala MOSiR");
  await command(ADMIN, "/match 09.11 18:00 AZS");
  assert.equal(store.data.matches.length, 2);

  await command(ADMIN, "/rakhunok 3:1");
  assert.match(replies.at(-1)!, /Не знайшов матчу без рахунку/);

  setClock(new Date("2026-11-02T20:00:00Z"));
  await command(ADMIN, "/rakhunok 3:1");
  assert.deepEqual(store.data.matches[0].result, { us: 3, them: 1 });
  assert.match(replies.at(-1)!, /✅ 3:1/);

  await command(ADMIN, "/pokaznyky 11 12 2 1 80");
  await command(ADMIN, "/pokaznyky 11 14 3 1 90");
  await command(ADMIN, "/pokaznyky 23 6 0 4");
  assert.equal(store.data.stats.length, 2);

  await command(PLAYER, "/matchi");
  assert.match(replies.at(-1)!, /1\. .+ — Volley Łódź · Hala MOSiR ✅ 3:1\n2\. .+ — AZS$/);

  await command(ADMIN, "/rakhunok 2 1:3");
  assert.deepEqual(store.data.matches[1].result, { us: 1, them: 3 });

  await command(ADMIN, "/match_vydalyty 1");
  assert.equal(store.data.matches.length, 1);
  assert.equal(store.data.stats.length, 0);
});

test("seasonStats рахує суму і середню подачу", () => {
  const store = memoryStore();
  store.data.stats = [
    { matchId: "a", playerNumber: "11", points: 12, aces: 2, blocks: 1, serve: 80 },
    { matchId: "b", playerNumber: "11", points: 8, aces: 1, blocks: 0, serve: 91 },
    { matchId: "a", playerNumber: "23", points: 6, aces: 0, blocks: 4, serve: null },
  ];
  assert.deepEqual(seasonStats(store.data), {
    "11": { points: 20, aces: 3, blocks: 1, matches: 2, serve: 86 },
    "23": { points: 6, aces: 0, blocks: 4, matches: 1, serve: null },
  });
});
