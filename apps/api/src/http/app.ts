import type { Api } from "grammy";
import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import {
  createLoginToken,
  createSession,
  deleteSessions,
  findLoginToken,
  findSession,
  hashKey,
  isGroupAdmin,
  randomKey,
  stillMember,
} from "../auth.ts";
import { teamTrainings } from "../bot/scheduler.ts";
import { matchup, registrationText } from "../bot/texts.ts";
import { LOGIN_TOKEN_MINUTES, SESSION_DAYS } from "../config.ts";
import { cupView, drawGroups, paidTeams } from "../cup.ts";
import { calendar, type CalendarEvent } from "../ics.ts";
import { recentMatches, seasonStats, sortedMatches, upcomingMatches, validateRegistration } from "../matches.ts";
import { photoBytes, type DownloadFile } from "../photos.ts";
import type {
  Answer,
  CupGame,
  Data,
  Lineup,
  Match,
  RegistrationStatus,
  Score,
  Session,
  StatLine,
  Store,
  Training,
} from "../storage.ts";
import { tournamentInfo } from "../tournament.ts";
import { zonedDate } from "../time.ts";

const SESSION_COOKIE = "pa_session";
const LOGIN_COOKIE = "pa_login";
const ATTENDANCE_COUNT = 12;

export interface AppDeps {
  store: Store;
  api: Api;
  botUsername: string;
  secureCookies: boolean;
  now?: () => Date;
  photoDir?: string;
  downloadFile?: DownloadFile;
}

function pollUrl(training: Training): string | null {
  const id = String(training.chatId);
  return id.startsWith("-100") ? `https://t.me/c/${id.slice(4)}/${training.messageId}` : null;
}

function counts(training: Training): Record<Answer, number> {
  const result: Record<Answer, number> = { yes: 0, no: 0, maybe: 0 };
  for (const answer of Object.values(training.votes)) result[answer] += 1;
  return result;
}

const UPCOMING_COUNT = 6;

function matchDto(match: Match) {
  return {
    id: match.id,
    startsAt: match.startsAt,
    opponent: match.opponent,
    place: match.place,
    result: match.result,
    round: match.round ?? null,
    home: match.home ?? true,
    sector: match.sector ?? null,
    sets: match.sets ?? [],
  };
}

const LIVE_HOURS = 3;
const POSITIONS = ["1", "2", "3", "4", "5", "6"];

export function currentMatch(data: Data, now: Date) {
  const sorted = [...data.matches].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const from = now.getTime() - LIVE_HOURS * 3600_000;
  const match = sorted.find((m) => new Date(m.startsAt).getTime() > from) ?? sorted.at(-1);
  if (!match) return { match: null };

  const votes = match.poll?.votes ?? {};
  const count = (answer: Answer) => Object.values(votes).filter((v) => v === answer).length;
  const goingIds = Object.entries(votes)
    .filter(([, answer]) => answer === "yes")
    .map(([id]) => id);

  return {
    match: matchDto(match),
    live: new Date(match.startsAt).getTime() <= now.getTime() && !match.result,
    poll: match.poll ? { yes: count("yes"), maybe: count("maybe"), no: count("no") } : null,
    going: goingIds.map((id) => data.links[id]).filter((n): n is string => Boolean(n)),
    goingUnlinked: goingIds.filter((id) => !data.links[id]).length,
    lineup: match.lineup ?? null,
    photos: photosOf(data, match.id),
  };
}

function photosOf(data: Data, matchId: string) {
  return data.photos
    .filter((p) => p.matchId === matchId)
    .map((p) => ({ id: p.id, width: p.width, height: p.height }));
}

const MATCH_MINUTES = 120;

function matchEvent(match: Match): CalendarEvent {
  const round = match.round ? `${match.round} kolejka II A ligi. ` : "";
  return {
    uid: match.id,
    start: new Date(match.startsAt),
    minutes: MATCH_MINUTES,
    title: `🏐 ${matchup(match)}`,
    location: match.place,
    description: `${round}Szczegóły i skład: /mecz`,
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]?\d|2[0-3]):[0-5]\d$/;

function parseWhen(date: unknown, time: unknown): Date | null {
  if (typeof date !== "string" || typeof time !== "string" || !DATE.test(date) || !TIME.test(time)) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const when = zonedDate(y, m, d, h, min);
  return Number.isNaN(when.getTime()) ? null : when;
}

function parseScore(value: unknown, max: number): Score | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const { us, them } = value as Record<string, unknown>;
  const ok = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= max;
  return ok(us) && ok(them) ? { us: us as number, them: them as number } : undefined;
}

function parseSets(value: unknown): Score[] | null {
  if (!Array.isArray(value) || value.length > 5) return null;
  const sets = value.map((s) => parseScore(s, 99));
  return sets.every((s): s is Score => Boolean(s)) ? sets : null;
}

function text(body: Record<string, unknown>, key: string, max: number): string | null {
  const value = body[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

function statLines(matchId: string, value: unknown): StatLine[] | null {
  if (!Array.isArray(value)) return null;
  const lines: StatLine[] = [];
  const count = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 999;
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const line = raw as Record<string, unknown>;
    const number = line.playerNumber;
    if (typeof number !== "string" || !/^\d{1,3}$/.test(number)) return null;
    if (!count(line.points) || !count(line.aces) || !count(line.blocks)) return null;
    const serve = line.serve ?? null;
    if (serve !== null && (!count(serve) || (serve as number) > 100)) return null;
    if (lines.some((l) => l.playerNumber === number)) return null;
    lines.push({
      matchId,
      playerNumber: number,
      points: line.points as number,
      aces: line.aces as number,
      blocks: line.blocks as number,
      serve: serve as number | null,
    });
  }
  return lines;
}

function parseLineup(body: Record<string, unknown>): Lineup | null {
  const raw = body.positions;
  if (!raw || typeof raw !== "object") return null;
  const number = (value: unknown) =>
    value === null || value === "" || value === undefined ? null : typeof value === "string" && /^\d{1,3}$/.test(value) ? value : undefined;

  const positions: Record<string, string | null> = {};
  for (const position of POSITIONS) {
    const value = number((raw as Record<string, unknown>)[position]);
    if (value === undefined) return null;
    positions[position] = value;
  }
  const libero = number(body.libero);
  if (libero === undefined) return null;

  const used = [...Object.values(positions), libero].filter((n): n is string => n !== null);
  if (new Set(used).size !== used.length) return null;
  return { positions, libero };
}

export function teamAttendance(data: Data, now: Date) {
  const trainings = teamTrainings(data);
  const past = trainings.filter((t) => new Date(t.startsAt).getTime() <= now.getTime()).slice(-ATTENDANCE_COUNT);
  const next = trainings.find((t) => new Date(t.startsAt).getTime() > now.getTime());

  const rows = Object.values(data.members).map((member) => {
    const key = String(member.id);
    return {
      name: member.name,
      playerNumber: data.links[key] ?? null,
      present: past.filter((t) => t.votes[key] === "yes").length,
      nextAnswer: next ? (next.votes[key] ?? null) : null,
    };
  });
  rows.sort((a, b) => b.present - a.present || a.name.localeCompare(b.name, "pl"));

  return { total: past.length, nextStartsAt: next?.startsAt ?? null, rows };
}

export function meResponse(data: Data, telegramId: number, now: Date, isCaptain = false) {
  const key = String(telegramId);
  const member = data.members[key];
  const trainings = teamTrainings(data);
  const next = trainings.find((t) => new Date(t.startsAt).getTime() > now.getTime());
  const past = trainings.filter((t) => new Date(t.startsAt).getTime() <= now.getTime()).slice(-ATTENDANCE_COUNT);
  const upcoming = trainings.filter((t) => new Date(t.startsAt).getTime() > now.getTime()).slice(0, UPCOMING_COUNT);

  return {
    user: { telegramId, name: member?.name ?? "", username: member?.username ?? null },
    isCaptain,
    playerNumber: data.links[key] ?? null,
    takenNumbers: Object.entries(data.links)
      .filter(([id]) => id !== key)
      .map(([, number]) => number),
    nextTraining: next
      ? {
          id: next.id,
          startsAt: next.startsAt,
          place: next.place,
          myAnswer: next.votes[key] ?? null,
          counts: counts(next),
          going: Object.entries(next.votes)
            .filter(([, answer]) => answer === "yes")
            .map(([id]) => data.members[id]?.name ?? "Без імені")
            .sort((a, b) => a.localeCompare(b, "pl")),
          pollUrl: pollUrl(next),
        }
      : null,
    upcoming: upcoming.map((t) => ({
      id: t.id,
      startsAt: t.startsAt,
      place: t.place,
      myAnswer: t.votes[key] ?? null,
      counts: counts(t),
    })),
    attendance: {
      items: past.map((t) => ({ startsAt: t.startsAt, answer: t.votes[key] ?? null })),
      present: past.filter((t) => t.votes[key] === "yes").length,
      total: past.length,
    },
  };
}

export type MeResponse = ReturnType<typeof meResponse>;

export function createApp(deps: AppDeps): Hono {
  const { store, api } = deps;
  const now = deps.now ?? (() => new Date());
  const app = new Hono().basePath("/api");
  const cookieBase = { httpOnly: true, sameSite: "Lax" as const, secure: deps.secureCookies, path: "/" };

  app.use("*", async (c, next) => {
    if (c.req.method === "POST" && !c.req.header("content-type")?.startsWith("application/json")) {
      return c.json({ error: "json_required" }, 415);
    }
    await next();
  });

  app.get("/health", (c) => c.json({ ok: true }));

  async function currentSession(c: Context): Promise<Session | undefined> {
    const session = findSession(store.data, getCookie(c, SESSION_COOKIE), now());
    if (!session) return undefined;
    if (!(await stillMember(api, store, session, now()))) return undefined;
    return session;
  }

  async function meFor(session: Session) {
    const chatId = store.data.chatId;
    const captain = chatId !== null && (await isGroupAdmin(api, chatId, session.telegramId));
    return meResponse(store.data, session.telegramId, now(), captain);
  }

  async function readJson(c: Context): Promise<Record<string, unknown>> {
    const body: unknown = await c.req.json().catch(() => null);
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  }

  app.post("/auth/telegram", async (c) => {
    if (store.data.chatId === null) return c.json({ error: "bot_not_bound" }, 503);
    const { token, browserKey } = createLoginToken(store.data, now());
    await store.save();
    setCookie(c, LOGIN_COOKIE, browserKey, { ...cookieBase, maxAge: LOGIN_TOKEN_MINUTES * 60 });
    return c.json({ token, link: `https://t.me/${deps.botUsername}?start=login_${token}` });
  });

  app.get("/auth/telegram/:token", async (c) => {
    const login = findLoginToken(store.data, c.req.param("token"), now());
    const browserKey = getCookie(c, LOGIN_COOKIE);
    if (!login || !browserKey || hashKey(browserKey) !== login.browserKeyHash) {
      return c.json({ status: "expired" });
    }
    if (login.status === "pending") return c.json({ status: "pending" });

    store.data.loginTokens = store.data.loginTokens.filter((t) => t !== login);
    deleteCookie(c, LOGIN_COOKIE, { path: "/" });
    if (login.status === "denied" || login.telegramId === undefined) {
      await store.save();
      return c.json({ status: "denied" });
    }

    const key = createSession(store.data, login.telegramId, now());
    await store.save();
    setCookie(c, SESSION_COOKIE, key, { ...cookieBase, maxAge: SESSION_DAYS * 24 * 3600 });
    return c.json({ status: "ok" });
  });

  app.post("/auth/logout", async (c) => {
    const key = getCookie(c, SESSION_COOKIE);
    if (key) {
      const hash = hashKey(key);
      deleteSessions(store.data, (s) => s.idHash === hash);
      await store.save();
    }
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  });

  app.get("/me", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    return c.json(await meFor(session));
  });

  app.get("/team/attendance", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const chatId = store.data.chatId;
    if (chatId === null || !(await isGroupAdmin(api, chatId, session.telegramId))) {
      return c.json({ error: "forbidden" }, 403);
    }
    return c.json(teamAttendance(store.data, now()));
  });

  app.get("/matches", (c) => {
    return c.json({
      upcoming: upcomingMatches(store.data, now()).map(matchDto),
      recent: recentMatches(store.data, now()).map(matchDto),
    });
  });

  app.get("/stats", (c) => c.json({ stats: seasonStats(store.data) }));

  app.get("/match/current", (c) => c.json(currentMatch(store.data, now())));

  app.post("/match/:id/lineup", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const chatId = store.data.chatId;
    if (chatId === null || !(await isGroupAdmin(api, chatId, session.telegramId))) {
      return c.json({ error: "forbidden" }, 403);
    }
    const match = store.data.matches.find((m) => m.id === c.req.param("id"));
    if (!match) return c.json({ error: "not_found" }, 404);
    const lineup = parseLineup(await readJson(c));
    if (!lineup) return c.json({ error: "invalid_lineup" }, 400);

    match.lineup = lineup;
    await store.save();
    return c.json(currentMatch(store.data, now()));
  });

  function tournamentResponse() {
    const info = tournamentInfo(store.data);
    const active = store.data.registrations.filter((r) => r.status !== "rejected");
    const paid = paidTeams(store.data.registrations);
    return {
      ...info,
      registered: active.length,
      confirmed: paid.length,
      spotsLeft: Math.max(0, info.maxTeams - active.length),
      teams: paid.map((r) => ({ name: r.teamName, city: r.city })),
      cup: cupView(store.data),
    };
  }

  app.get("/tournament", (c) => c.json(tournamentResponse()));

  app.post("/tournament/registrations", async (c) => {
    const body = await readJson(c);
    if (typeof body.website === "string" && body.website !== "") return c.json({ ok: true, ...tournamentResponse() });
    const info = tournamentInfo(store.data);
    if (!info.registrationOpen) return c.json({ error: "closed" }, 403);

    const input = validateRegistration(body);
    if ("field" in input) return c.json({ error: "invalid", field: input.field }, 400);

    const list = store.data.registrations;
    const active = list.filter((r) => r.status !== "rejected");
    if (active.length >= info.maxTeams) return c.json({ error: "full" }, 409);
    if (active.some((r) => r.teamName.toLowerCase() === input.teamName.toLowerCase())) {
      return c.json({ error: "team_taken" }, 409);
    }
    if (active.some((r) => r.email === input.email)) return c.json({ error: "email_taken" }, 409);

    const registration = { id: randomKey(8), createdAt: now().toISOString(), ...input, status: "pending" as const };
    list.push(registration);
    await store.save();

    const chatId = store.data.chatId;
    if (chatId !== null) {
      const message = `🆕 Нова заявка на турнір (${active.length + 1}/${info.maxTeams})\n\n${registrationText(registration)}\n\nПідтвердити оплату: /admin на сайті`;
      await api
        .sendMessage(chatId, message, { parse_mode: "HTML" })
        .catch((error: unknown) => console.error("Не вдалося повідомити групу про заявку:", error));
    }
    return c.json({ ok: true, ...tournamentResponse() });
  });

  app.get("/standings", (c) => c.json(store.data.standings ?? { updatedAt: null, rows: [] }));

  app.get("/leaderboard", (c) => {
    const entries = Object.entries(seasonStats(store.data));
    const top = (key: "points" | "aces" | "blocks") =>
      entries
        .filter(([, s]) => s[key] > 0)
        .sort(([, a], [, b]) => b[key] - a[key])
        .slice(0, 5)
        .map(([number, s]) => ({ number, value: s[key], matches: s.matches }));
    return c.json({ points: top("points"), aces: top("aces"), blocks: top("blocks") });
  });

  app.get("/players/:number", (c) => {
    const number = c.req.param("number");
    const games = sortedMatches(store.data).flatMap((match) => {
      const line = store.data.stats.find((s) => s.matchId === match.id && s.playerNumber === number);
      return line
        ? [{ match: matchDto(match), points: line.points, aces: line.aces, blocks: line.blocks, serve: line.serve }]
        : [];
    });
    return c.json({ number, totals: seasonStats(store.data)[number] ?? null, games });
  });

  app.get("/team/leaders", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const { total, rows } = teamAttendance(store.data, now());
    return c.json({
      total,
      rows: rows.slice(0, 5).map((r) => ({ name: r.name, playerNumber: r.playerNumber, present: r.present })),
    });
  });

  const ics = (c: Context, body: string, filename: string) =>
    c.body(body, 200, {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    });

  app.get("/calendar/matches.ics", (c) =>
    ics(c, calendar("Pocket Aces — mecze", sortedMatches(store.data).map(matchEvent), now()), "pocket-aces-mecze.ics"),
  );

  app.get("/calendar/match/:id", (c) => {
    const match = store.data.matches.find((m) => m.id === c.req.param("id"));
    if (!match) return c.json({ error: "not_found" }, 404);
    return ics(c, calendar("Pocket Aces", [matchEvent(match)], now()), "mecz.ics");
  });

  app.get("/calendar/trainings.ics", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const events = teamTrainings(store.data)
      .filter((t) => new Date(t.startsAt).getTime() > now().getTime())
      .map((t) => ({
        uid: t.id,
        start: new Date(t.startsAt),
        minutes: 120,
        title: "🏐 Trening Pocket Aces",
        location: t.place,
      }));
    return ics(c, calendar("Pocket Aces — treningi", events, now()), "pocket-aces-treningi.ics");
  });

  app.get("/photos/latest", (c) => {
    const latest = [...store.data.photos].sort((a, b) => b.addedAt.localeCompare(a.addedAt))[0];
    const match = latest && store.data.matches.find((m) => m.id === latest.matchId);
    return c.json(match ? { match: matchDto(match), photos: photosOf(store.data, match.id) } : { match: null, photos: [] });
  });

  app.get("/photos/:id", async (c) => {
    const photo = store.data.photos.find((p) => p.id === c.req.param("id"));
    if (!photo || !deps.photoDir || !deps.downloadFile) return c.json({ error: "not_found" }, 404);
    try {
      const bytes = await photoBytes(deps.photoDir, photo, deps.downloadFile);
      return c.body(bytes as Uint8Array<ArrayBuffer>, 200, {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=31536000, immutable",
      });
    } catch (error) {
      console.error("Не вдалося завантажити фото з Telegram:", error);
      return c.json({ error: "unavailable" }, 502);
    }
  });

  app.use("/admin/*", async (c, next) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const chatId = store.data.chatId;
    if (chatId === null || !(await isGroupAdmin(api, chatId, session.telegramId))) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  });

  function adminOverview() {
    const data = store.data;
    return {
      matches: sortedMatches(data).map((match) => ({
        ...matchDto(match),
        source: match.source ?? "manual",
        stats: data.stats
          .filter((s) => s.matchId === match.id)
          .map(({ playerNumber, points, aces, blocks, serve }) => ({ playerNumber, points, aces, blocks, serve })),
        photos: photosOf(data, match.id),
      })),
      tournament: tournamentInfo(data),
      registrations: data.registrations.map((r) => ({ ...r, status: r.status ?? "pending" })),
      cup: { ...cupView(data), raw: data.cup },
    };
  }

  app.get("/admin/overview", (c) => c.json(adminOverview()));

  app.post("/admin/matches", async (c) => {
    const body = await readJson(c);
    const when = parseWhen(body.date, body.time);
    const opponent = text(body, "opponent", 80);
    const place = text(body, "place", 120) ?? "";
    if (!when || !opponent) return c.json({ error: "invalid" }, 400);
    store.data.matches.push({
      id: `m${when.getTime()}-${randomKey(3)}`,
      startsAt: when.toISOString(),
      opponent,
      place,
      result: null,
      source: "manual",
      sets: [],
      poll: null,
      lineup: null,
    });
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/matches/:id", async (c) => {
    const match = store.data.matches.find((m) => m.id === c.req.param("id"));
    if (!match) return c.json({ error: "not_found" }, 404);
    const body = await readJson(c);

    if ("result" in body) {
      const result = parseScore(body.result, 5);
      if (result === undefined) return c.json({ error: "invalid" }, 400);
      match.result = result;
    }
    if ("sets" in body) {
      const sets = parseSets(body.sets);
      if (!sets) return c.json({ error: "invalid" }, 400);
      match.sets = sets;
    }
    if (match.source !== "league") {
      if ("opponent" in body) {
        const opponent = text(body, "opponent", 80);
        if (!opponent) return c.json({ error: "invalid" }, 400);
        match.opponent = opponent;
      }
      if ("place" in body) match.place = text(body, "place", 120) ?? match.place;
      if ("date" in body || "time" in body) {
        const when = parseWhen(body.date, body.time);
        if (!when) return c.json({ error: "invalid" }, 400);
        match.startsAt = when.toISOString();
      }
    }
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/matches/:id/delete", async (c) => {
    const id = c.req.param("id");
    const match = store.data.matches.find((m) => m.id === id);
    if (!match) return c.json({ error: "not_found" }, 404);
    if (match.source === "league") return c.json({ error: "league_match" }, 409);
    store.data.matches = store.data.matches.filter((m) => m.id !== id);
    store.data.stats = store.data.stats.filter((s) => s.matchId !== id);
    store.data.photos = store.data.photos.filter((p) => p.matchId !== id);
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/matches/:id/stats", async (c) => {
    const id = c.req.param("id");
    if (!store.data.matches.some((m) => m.id === id)) return c.json({ error: "not_found" }, 404);
    const lines = statLines(id, (await readJson(c)).lines);
    if (!lines) return c.json({ error: "invalid" }, 400);
    store.data.stats = [...store.data.stats.filter((s) => s.matchId !== id), ...lines];
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/photos/:id/delete", async (c) => {
    const id = c.req.param("id");
    store.data.photos = store.data.photos.filter((p) => p.id !== id);
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/tournament", async (c) => {
    const body = await readJson(c);
    const name = text(body, "name", 80);
    const place = text(body, "place", 120);
    const date =
      body.date === null || body.date === ""
        ? null
        : typeof body.date === "string" && DATE.test(body.date)
          ? body.date
          : undefined;
    const { feePln, maxTeams, registrationOpen } = body;
    const whole = (n: unknown, min: number, max: number): n is number =>
      typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
    if (!name || !place || date === undefined || !whole(feePln, 0, 100_000) || !whole(maxTeams, 2, 64) || typeof registrationOpen !== "boolean") {
      return c.json({ error: "invalid" }, 400);
    }
    store.data.tournament = { name, date, place, feePln, maxTeams, registrationOpen };
    await store.save();
    return c.json(adminOverview());
  });

  const STATUSES: RegistrationStatus[] = ["pending", "paid", "rejected"];

  app.post("/admin/registrations/:id", async (c) => {
    const registration = store.data.registrations.find((r) => r.id === c.req.param("id"));
    if (!registration) return c.json({ error: "not_found" }, 404);
    const status = (await readJson(c)).status;
    if (!STATUSES.includes(status as RegistrationStatus)) return c.json({ error: "invalid" }, 400);
    registration.status = status as RegistrationStatus;
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/cup/draw", async (c) => {
    const groupCount = (await readJson(c)).groupCount;
    const teams = paidTeams(store.data.registrations).map((r) => r.id);
    if (typeof groupCount !== "number" || !Number.isInteger(groupCount) || groupCount < 1 || teams.length < groupCount * 2) {
      return c.json({ error: "invalid" }, 400);
    }
    store.data.cup = drawGroups(teams, groupCount);
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/cup/games", async (c) => {
    const body = await readJson(c);
    const label = text(body, "label", 40);
    const ids = new Set(store.data.registrations.map((r) => r.id));
    const { home, away } = body;
    if (!label || typeof home !== "string" || typeof away !== "string" || home === away || !ids.has(home) || !ids.has(away)) {
      return c.json({ error: "invalid" }, 400);
    }
    const game: CupGame = { id: randomKey(6), stage: "playoff", group: null, label, home, away, startsAt: null, court: "", sets: [] };
    store.data.cup.games.push(game);
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/cup/games/:id", async (c) => {
    const game = store.data.cup.games.find((g) => g.id === c.req.param("id"));
    if (!game) return c.json({ error: "not_found" }, 404);
    const body = await readJson(c);
    if ("sets" in body) {
      const sets = parseSets(body.sets);
      if (!sets || sets.length > 3) return c.json({ error: "invalid" }, 400);
      game.sets = sets;
    }
    if ("court" in body) game.court = text(body, "court", 40) ?? game.court;
    if ("date" in body || "time" in body) {
      if (body.date === "" || body.date === null) {
        game.startsAt = null;
      } else {
        const when = parseWhen(body.date, body.time);
        if (!when) return c.json({ error: "invalid" }, 400);
        game.startsAt = when.toISOString();
      }
    }
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/admin/cup/games/:id/delete", async (c) => {
    store.data.cup.games = store.data.cup.games.filter((g) => g.id !== c.req.param("id"));
    await store.save();
    return c.json(adminOverview());
  });

  app.post("/me/player", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const body = await readJson(c);
    const number = typeof body.number === "string" ? body.number.trim() : "";
    if (!/^\d{1,3}$/.test(number)) return c.json({ error: "invalid_number" }, 400);

    const key = String(session.telegramId);
    const links = store.data.links;
    if (links[key] && links[key] !== number) return c.json({ error: "already_linked" }, 409);
    if (Object.entries(links).some(([id, n]) => n === number && id !== key)) {
      return c.json({ error: "taken" }, 409);
    }
    links[key] = number;
    await store.save();
    return c.json(await meFor(session));
  });

  app.post("/trainings/:id/answer", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const body = await readJson(c);
    const answer = body.answer;
    if (answer !== "yes" && answer !== "no" && answer !== "maybe") return c.json({ error: "invalid_answer" }, 400);

    const training = teamTrainings(store.data).find((t) => t.id === c.req.param("id"));
    if (!training || training.closed || new Date(training.startsAt).getTime() <= now().getTime()) {
      return c.json({ error: "closed" }, 409);
    }
    training.votes[String(session.telegramId)] = answer;
    await store.save();
    return c.json(await meFor(session));
  });

  return app;
}
