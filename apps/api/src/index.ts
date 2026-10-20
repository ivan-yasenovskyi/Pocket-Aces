import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { COMMANDS, createBot } from "./bot/bot.ts";
import { tick } from "./bot/scheduler.ts";
import { createApp } from "./http/app.ts";
import { openStore } from "./storage.ts";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("Немає BOT_TOKEN. Створи файл apps/api/.env за зразком .env.example.");
  process.exit(1);
}

const store = await openStore(fileURLToPath(new URL("../data/db.json", import.meta.url)));
const bot = createBot(token, store);
await bot.init();

await bot.api.setMyCommands(COMMANDS);
await bot.api.setMyCommands(COMMANDS, { scope: { type: "all_group_chats" } });

const app = createApp({
  store,
  api: bot.api,
  botUsername: bot.botInfo.username,
  secureCookies: process.env.NODE_ENV === "production",
});

const port = Number(process.env.PORT ?? 4000);
const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`API працює: http://localhost:${info.port}/api`);
});

async function runTick(): Promise<void> {
  try {
    await tick(bot.api, store, new Date());
  } catch (error) {
    console.error("Помилка розкладу:", error);
  }
}

const timer = setInterval(runTick, 60_000);
await runTick();

process.once("SIGINT", () => {
  clearInterval(timer);
  server.close();
  void bot.stop();
});

await bot.start({
  allowed_updates: ["message", "poll_answer"],
  onStart: (me) => console.log(`Бот @${me.username} працює. Зупинити: Ctrl+C`),
});
