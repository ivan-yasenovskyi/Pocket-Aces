import { Bot, type Context } from "grammy";
import type { User, UserFromGetMe } from "grammy/types";
import { deleteSessions, findLoginToken, isGroupMember } from "../auth.ts";
import { STAT_DAYS } from "../config.ts";
import { parseSlot, parseTraining } from "./parse.ts";
import { announce, closePoll, findTraining, nextTraining, teamTrainings, tick } from "./scheduler.ts";
import type { Store } from "../storage.ts";
import {
  ADMIN_ONLY_TEXT,
  BOUND_TEXT,
  HELP_TEXT,
  LOGIN_DENIED_TEXT,
  LOGIN_EXPIRED_TEXT,
  LOGIN_OK_TEXT,
  NOT_BOUND_TEXT,
  POLL_OPTIONS,
  PRIVATE_TEXT,
  attendanceText,
  escapeHtml,
  scheduleText,
  slotText,
  statText,
} from "./texts.ts";
import { formatWhen } from "../time.ts";

export const COMMANDS = [
  { command: "hto", description: "Хто буде на найближчому тренуванні" },
  { command: "rozklad", description: "Розклад і найближчі тренування" },
  { command: "stat", description: `Відмітки за ${STAT_DAYS} днів` },
  { command: "trening", description: "Разове тренування (адмін): 24.10 19:00 Зал" },
  { command: "rozklad_dodaty", description: "Постійне тренування (адмін): вт 19:00 Зал" },
  { command: "rozklad_vydalyty", description: "Прибрати постійне тренування (адмін)" },
  { command: "skasuvaty", description: "Скасувати найближче тренування (адмін)" },
  { command: "vidvyazaty", description: "Відв'язати картку гравця на сайті (адмін): 11" },
  { command: "help", description: "Усі команди" },
];

export interface BotOptions {
  botInfo?: UserFromGetMe;
  now?: () => Date;
}

export function createBot(token: string, store: Store, options: BotOptions = {}): Bot {
  const bot = new Bot(token, options.botInfo ? { botInfo: options.botInfo } : undefined);
  const clock = options.now ?? (() => new Date());
  const data = store.data;
  const html = { parse_mode: "HTML" as const };

  function remember(user: User): boolean {
    if (user.is_bot) return false;
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ");
    const key = String(user.id);
    const old = data.members[key];
    if (old && old.name === name && old.username === user.username) return false;
    data.members[key] = { id: user.id, name, username: user.username };
    return true;
  }

  function isTeamChat(ctx: Context): boolean {
    return data.chatId !== null && ctx.chat?.id === data.chatId;
  }

  async function isAdmin(ctx: Context): Promise<boolean> {
    if (!ctx.chat || ctx.chat.type === "private") return false;
    if (ctx.senderChat?.id === ctx.chat.id) return true;
    if (!ctx.from) return false;
    const member = await ctx.api.getChatMember(ctx.chat.id, ctx.from.id);
    return member.status === "creator" || member.status === "administrator";
  }

  async function requireTeamChat(ctx: Context): Promise<boolean> {
    if (ctx.chat?.type === "private") {
      await ctx.reply(PRIVATE_TEXT);
      return false;
    }
    if (!isTeamChat(ctx)) {
      await ctx.reply(NOT_BOUND_TEXT);
      return false;
    }
    return true;
  }

  async function requireAdmin(ctx: Context): Promise<boolean> {
    if (await isAdmin(ctx)) return true;
    await ctx.reply(ADMIN_ONLY_TEXT);
    return false;
  }

  bot.use(async (ctx, next) => {
    if (isTeamChat(ctx) && ctx.from && remember(ctx.from)) await store.save();
    await next();
  });

  bot.on("message:new_chat_members", async (ctx) => {
    if (!isTeamChat(ctx)) return;
    const changed = ctx.message.new_chat_members.map(remember).some(Boolean);
    if (changed) await store.save();
  });

  bot.on("message:left_chat_member", async (ctx) => {
    if (!isTeamChat(ctx)) return;
    const userId = ctx.message.left_chat_member.id;
    delete data.members[String(userId)];
    deleteSessions(data, (s) => s.telegramId === userId);
    await store.save();
  });

  bot.on("message:migrate_to_chat_id", async (ctx) => {
    if (!isTeamChat(ctx)) return;
    const newId = ctx.message.migrate_to_chat_id;
    for (const training of data.trainings) {
      if (training.chatId === data.chatId) training.chatId = newId;
    }
    data.chatId = newId;
    await store.save();
  });

  bot.on("poll_answer", async (ctx) => {
    const answer = ctx.pollAnswer;
    const training = data.trainings.find((t) => t.pollId === answer.poll_id);
    if (!training || !answer.user) return;

    remember(answer.user);
    const key = String(answer.user.id);
    const option = answer.option_ids[0];
    if (option === undefined) {
      delete training.votes[key];
    } else {
      training.votes[key] = POLL_OPTIONS[option].answer;
    }
    await store.save();
  });

  async function confirmLogin(ctx: Context, token: string): Promise<void> {
    const now = clock();
    const login = findLoginToken(data, token, now);
    if (!login || login.status !== "pending" || !ctx.from) {
      await ctx.reply(LOGIN_EXPIRED_TEXT);
      return;
    }
    if (data.chatId === null) {
      await ctx.reply(NOT_BOUND_TEXT);
      return;
    }
    const member = await isGroupMember(ctx.api, data.chatId, ctx.from.id);
    login.status = member ? "confirmed" : "denied";
    login.telegramId = ctx.from.id;
    if (member) remember(ctx.from);
    await store.save();
    await ctx.reply(member ? LOGIN_OK_TEXT : LOGIN_DENIED_TEXT);
  }

  bot.command("start", async (ctx) => {
    if (ctx.chat.type === "private") {
      const payload = ctx.match.trim();
      if (payload.startsWith("login_")) {
        await confirmLogin(ctx, payload.slice("login_".length));
        return;
      }
      await ctx.reply(PRIVATE_TEXT);
      return;
    }
    if (!(await requireAdmin(ctx))) return;
    data.chatId = ctx.chat.id;
    if (ctx.from) remember(ctx.from);
    await store.save();
    await ctx.reply(BOUND_TEXT);
    await tick(ctx.api, store, new Date());
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(HELP_TEXT, html);
  });

  bot.command("hto", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    const training = nextTraining(data, new Date());
    if (!training) {
      await ctx.reply("Найближчих тренувань немає. Адміністратор може додати: /trening 24.10 19:00 Зал");
      return;
    }
    await ctx.reply(attendanceText(training, data), {
      ...html,
      reply_parameters: { message_id: training.messageId, allow_sending_without_reply: true },
    });
  });

  bot.command("rozklad", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    const now = Date.now();
    const upcoming = teamTrainings(data).filter((t) => new Date(t.startsAt).getTime() > now);
    await ctx.reply(scheduleText(data, upcoming), html);
  });

  bot.command("stat", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    const now = Date.now();
    const from = now - STAT_DAYS * 24 * 3600_000;
    const past = teamTrainings(data).filter((t) => {
      const start = new Date(t.startsAt).getTime();
      return start >= from && start <= now;
    });
    await ctx.reply(statText(data, past), html);
  });

  bot.command("trening", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const now = new Date();
    const parsed = parseTraining(ctx.match, now);
    if ("error" in parsed) {
      await ctx.reply(parsed.error);
      return;
    }
    const existing = findTraining(data, parsed.startsAt);
    if (existing && !existing.cancelled) {
      await ctx.reply("Таке тренування вже є — опитування вище.", {
        reply_parameters: { message_id: existing.messageId, allow_sending_without_reply: true },
      });
      return;
    }
    if (existing) data.trainings.splice(data.trainings.indexOf(existing), 1);
    await announce(ctx.api, store, { ...parsed, source: "manual" }, now);
  });

  bot.command("rozklad_dodaty", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const parsed = parseSlot(ctx.match);
    if ("error" in parsed) {
      await ctx.reply(parsed.error);
      return;
    }
    data.slots.push(parsed);
    data.slots.sort((a, b) => a.weekday - b.weekday || a.hour - b.hour || a.minute - b.minute);
    await store.save();
    await ctx.reply(
      `✅ Додав постійне тренування: ${escapeHtml(slotText(parsed))}\nОпитування з'являтиметься за добу до початку.`,
      html,
    );
    await tick(ctx.api, store, new Date());
  });

  bot.command("rozklad_vydalyty", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const index = Number(ctx.match.trim()) - 1;
    const slot = data.slots[index];
    if (!slot) {
      await ctx.reply("Вкажи номер з /rozklad, наприклад: /rozklad_vydalyty 1");
      return;
    }
    data.slots.splice(index, 1);
    await store.save();
    await ctx.reply(`🗑 Прибрав: ${escapeHtml(slotText(slot))}`, html);
  });

  bot.command("skasuvaty", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const now = Date.now();
    const training = teamTrainings(data).find((t) => new Date(t.startsAt).getTime() > now);
    if (!training) {
      await ctx.reply("Немає майбутніх тренувань, які можна скасувати.");
      return;
    }
    training.cancelled = true;
    await store.save();
    await closePoll(ctx.api, training);
    await ctx.reply(`❌ Тренування ${escapeHtml(formatWhen(new Date(training.startsAt)))} скасовано.`, {
      ...html,
      reply_parameters: { message_id: training.messageId, allow_sending_without_reply: true },
    });
  });

  bot.command("vidvyazaty", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const number = ctx.match.trim();
    const entry = Object.entries(data.links).find(([, n]) => n === number);
    if (!entry) {
      await ctx.reply("Цю картку ще ніхто не обрав. Формат: /vidvyazaty 11");
      return;
    }
    delete data.links[entry[0]];
    await store.save();
    await ctx.reply(`Картку №${number} відв'язано. Гравець обере її заново при вході на сайт.`);
  });

  bot.catch((error) => {
    console.error("Помилка в обробці повідомлення:", error.error);
  });

  return bot;
}
