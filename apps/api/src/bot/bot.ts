import { Bot, type Context } from "grammy";
import type { User, UserFromGetMe } from "grammy/types";
import { deleteSessions, findLoginToken, isGroupMember, randomKey } from "../auth.ts";
import { STAT_DAYS } from "../config.ts";
import { syncLeague } from "../league.ts";
import { recentMatches, sortedMatches, upcomingMatches } from "../matches.ts";
import { TOURNAMENT } from "../tournament.ts";
import { parseMatch, parseScore, parseSlot, parseStatLine, parseTraining } from "./parse.ts";
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
  matchText,
  matchesListText,
  registrationsText,
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
  { command: "matchi", description: "Список матчів" },
  { command: "match", description: "Додати матч (адмін): 02.11 18:00 Суперник | Зал" },
  { command: "rakhunok", description: "Рахунок останнього матчу (адмін): 3:1" },
  { command: "pokaznyky", description: "Показники гравця в матчі (адмін): 11 12 2 1 87" },
  { command: "match_vydalyty", description: "Видалити матч (адмін): 2" },
  { command: "zayavky", description: "Заявки на турнір (адмін)" },
  { command: "sklad", description: "Хто грає в найближчому матчі" },
  { command: "liga", description: "Оновити матчі з siatka-lodzkie.org зараз (адмін)" },
  { command: "foto", description: "Фото з матчу: надішли фото з підписом /foto (адмін)" },
  { command: "help", description: "Усі команди" },
];

export interface BotOptions {
  botInfo?: UserFromGetMe;
  now?: () => Date;
  loadLeague?: () => Promise<string>;
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
    const target =
      data.trainings.find((t) => t.pollId === answer.poll_id) ??
      data.matches.find((m) => m.poll?.pollId === answer.poll_id)?.poll;
    if (!target || !answer.user) return;

    remember(answer.user);
    const key = String(answer.user.id);
    const option = answer.option_ids[0];
    if (option === undefined) {
      delete target.votes[key];
    } else {
      target.votes[key] = POLL_OPTIONS[option].answer;
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

  bot.command("matchi", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    await ctx.reply(matchesListText(sortedMatches(data)), html);
  });

  bot.command("match", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const parsed = parseMatch(ctx.match, clock());
    if ("error" in parsed) {
      await ctx.reply(parsed.error);
      return;
    }
    const match = {
      id: `m${parsed.startsAt.getTime()}`,
      startsAt: parsed.startsAt.toISOString(),
      opponent: parsed.opponent,
      place: parsed.place,
      result: null,
    };
    data.matches = data.matches.filter((m) => m.id !== match.id);
    data.matches.push(match);
    await store.save();
    await ctx.reply(`✅ Додав матч: ${escapeHtml(matchText(match))}\nВін уже з'явився на сайті.`, html);
  });

  bot.command("rakhunok", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const usage = "Формат: /rakhunok 3:1 (останній зіграний матч) або /rakhunok 2 3:1 (матч №2 з /matchi)";
    const parts = ctx.match.trim().split(/\s+/);
    const score = parseScore(parts.at(-1) ?? "");
    if (!score || parts.length > 2) {
      await ctx.reply(usage);
      return;
    }
    const match =
      parts.length === 2
        ? sortedMatches(data)[Number(parts[0]) - 1]
        : recentMatches(data, clock(), 20).find((m) => m.result === null);
    if (!match) {
      await ctx.reply(`Не знайшов матчу без рахунку. ${usage}`);
      return;
    }
    match.result = score;
    await store.save();
    await ctx.reply(`🏆 Записав: ${escapeHtml(matchText(match))}`, html);
  });

  bot.command("pokaznyky", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const parsed = parseStatLine(ctx.match);
    if ("error" in parsed) {
      await ctx.reply(parsed.error);
      return;
    }
    const match = recentMatches(data, clock(), 1)[0];
    if (!match) {
      await ctx.reply("Ще немає зіграних матчів. Спочатку додай матч: /match 02.11 18:00 Суперник");
      return;
    }
    data.stats = data.stats.filter((s) => !(s.matchId === match.id && s.playerNumber === parsed.playerNumber));
    data.stats.push({ matchId: match.id, ...parsed });
    await store.save();
    const serve = parsed.serve === null ? "" : ` · подача ${parsed.serve}%`;
    await ctx.reply(
      `📊 №${parsed.playerNumber} проти ${escapeHtml(match.opponent)}: ${parsed.points} очк. · ${parsed.aces} ейс. · ${parsed.blocks} блок.${serve}`,
      html,
    );
  });

  bot.command("match_vydalyty", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    const match = sortedMatches(data)[Number(ctx.match.trim()) - 1];
    if (!match) {
      await ctx.reply("Вкажи номер з /matchi, наприклад: /match_vydalyty 2");
      return;
    }
    data.matches = data.matches.filter((m) => m.id !== match.id);
    data.stats = data.stats.filter((s) => s.matchId !== match.id);
    await store.save();
    await ctx.reply(`🗑 Видалив матч: ${escapeHtml(matchText(match))}`, html);
  });

  bot.command("zayavky", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    await ctx.reply(registrationsText(data.registrations, TOURNAMENT.maxTeams), html);
  });

  bot.command("sklad", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    const match = upcomingMatches(data, clock())[0];
    if (!match) {
      await ctx.reply("Найближчих матчів немає.");
      return;
    }
    if (!match.poll) {
      await ctx.reply(`Наступний матч: ${matchText(match)}\nОпитування з'явиться ближче до дати.`);
      return;
    }
    await ctx.reply(attendanceText({ ...match, votes: match.poll.votes }, data, `🏐 Матч проти ${escapeHtml(match.opponent)}:`), {
      ...html,
      reply_parameters: { message_id: match.poll.messageId, allow_sending_without_reply: true },
    });
  });

  bot.command("liga", async (ctx) => {
    if (!(await requireTeamChat(ctx))) return;
    if (!(await requireAdmin(ctx))) return;
    try {
      const changes = await syncLeague(ctx.api, store, options.loadLeague);
      await tick(ctx.api, store, clock());
      const next = upcomingMatches(data, clock())[0];
      await ctx.reply(
        [
          `🔄 Оновив terminarz: нових матчів ${changes.added.length}, перенесених ${changes.moved.length}.`,
          next ? `Наступний: ${escapeHtml(matchText(next))}` : "Майбутніх матчів у terminarzu немає.",
        ].join("\n"),
        html,
      );
    } catch (error) {
      await ctx.reply(`Не вдалося оновити terminarz: ${escapeHtml(String((error as Error).message ?? error))}`, html);
    }
  });

  const albums = new Map<string, string>();
  bot.on("message:photo", async (ctx) => {
    if (!isTeamChat(ctx)) return;
    const album = ctx.message.media_group_id;
    let matchId = album ? albums.get(album) : undefined;
    const fromAlbum = matchId !== undefined;

    if (!matchId) {
      const command = (ctx.message.caption ?? "").trim().match(/^[/#]foto(?:@\w+)?(?:\s+(\d+))?/i);
      if (!command) return;
      if (!(await isAdmin(ctx))) {
        await ctx.reply(ADMIN_ONLY_TEXT);
        return;
      }
      const match = command[1] ? sortedMatches(data)[Number(command[1]) - 1] : recentMatches(data, clock(), 1)[0];
      if (!match) {
        await ctx.reply("Не знайшов матчу. /foto — останній зіграний, /foto 3 — матч №3 з /matchi.");
        return;
      }
      matchId = match.id;
      if (album) albums.set(album, matchId);
    }

    const size = ctx.message.photo.at(-1)!;
    data.photos.push({
      id: randomKey(8),
      matchId,
      fileId: size.file_id,
      width: size.width,
      height: size.height,
      addedAt: clock().toISOString(),
    });
    await store.save();
    if (!fromAlbum) {
      const match = data.matches.find((m) => m.id === matchId);
      await ctx.reply(`📸 Фото додано до матчу проти ${escapeHtml(match?.opponent ?? "?")} — вони вже на сайті.`, html);
    }
  });

  bot.catch((error) => {
    console.error("Помилка в обробці повідомлення:", error.error);
  });

  return bot;
}
