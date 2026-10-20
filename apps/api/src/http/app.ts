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
  stillMember,
} from "../auth.ts";
import { teamTrainings } from "../bot/scheduler.ts";
import { LOGIN_TOKEN_MINUTES, SESSION_DAYS } from "../config.ts";
import type { Answer, Data, Session, Store, Training } from "../storage.ts";

const SESSION_COOKIE = "pa_session";
const LOGIN_COOKIE = "pa_login";
const ATTENDANCE_COUNT = 12;

export interface AppDeps {
  store: Store;
  api: Api;
  botUsername: string;
  secureCookies: boolean;
  now?: () => Date;
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

export function meResponse(data: Data, telegramId: number, now: Date) {
  const key = String(telegramId);
  const member = data.members[key];
  const trainings = teamTrainings(data);
  const next = trainings.find((t) => new Date(t.startsAt).getTime() > now.getTime());
  const past = trainings.filter((t) => new Date(t.startsAt).getTime() <= now.getTime()).slice(-ATTENDANCE_COUNT);

  return {
    user: { telegramId, name: member?.name ?? "", username: member?.username ?? null },
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

  async function currentSession(c: Context): Promise<Session | undefined> {
    const session = findSession(store.data, getCookie(c, SESSION_COOKIE), now());
    if (!session) return undefined;
    if (!(await stillMember(api, store, session, now()))) return undefined;
    return session;
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
    return c.json(meResponse(store.data, session.telegramId, now()));
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
    return c.json(meResponse(store.data, session.telegramId, now()));
  });

  app.post("/trainings/:id/answer", async (c) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: "unauthorized" }, 401);
    const body = await readJson(c);
    const answer = body.answer;
    if (answer !== "yes" && answer !== "no") return c.json({ error: "invalid_answer" }, 400);

    const training = teamTrainings(store.data).find((t) => t.id === c.req.param("id"));
    if (!training || training.closed || new Date(training.startsAt).getTime() <= now().getTime()) {
      return c.json({ error: "closed" }, 409);
    }
    training.votes[String(session.telegramId)] = answer;
    await store.save();
    return c.json(meResponse(store.data, session.telegramId, now()));
  });

  return app;
}
