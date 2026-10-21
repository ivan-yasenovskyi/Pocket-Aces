import { createHash, randomBytes } from "node:crypto";
import type { Api } from "grammy";
import { LOGIN_TOKEN_MINUTES, MEMBERSHIP_CHECK_MINUTES, SESSION_DAYS } from "./config.ts";
import type { Data, LoginToken, Session, Store } from "./storage.ts";

const MINUTE = 60_000;

export function randomKey(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export async function isGroupMember(api: Api, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await api.getChatMember(chatId, userId);
    if (member.status === "creator" || member.status === "administrator" || member.status === "member") return true;
    if (member.status === "restricted") return member.is_member;
    return false;
  } catch {
    return false;
  }
}

export async function isGroupAdmin(api: Api, chatId: number, userId: number): Promise<boolean> {
  try {
    const member = await api.getChatMember(chatId, userId);
    return member.status === "creator" || member.status === "administrator";
  } catch {
    return false;
  }
}

function removeExpiredTokens(data: Data, now: Date): void {
  const oldest = now.getTime() - LOGIN_TOKEN_MINUTES * MINUTE;
  data.loginTokens = data.loginTokens.filter((t) => new Date(t.createdAt).getTime() >= oldest);
}

export function createLoginToken(data: Data, now: Date): { token: string; browserKey: string } {
  removeExpiredTokens(data, now);
  const token = randomKey(16);
  const browserKey = randomKey();
  data.loginTokens.push({
    token,
    browserKeyHash: hashKey(browserKey),
    createdAt: now.toISOString(),
    status: "pending",
  });
  return { token, browserKey };
}

export function findLoginToken(data: Data, token: string, now: Date): LoginToken | undefined {
  removeExpiredTokens(data, now);
  return data.loginTokens.find((t) => t.token === token);
}

export function createSession(data: Data, telegramId: number, now: Date): string {
  const key = randomKey(32);
  data.sessions.push({
    idHash: hashKey(key),
    telegramId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_DAYS * 24 * 60 * MINUTE).toISOString(),
    checkedAt: now.toISOString(),
  });
  return key;
}

export function findSession(data: Data, key: string | undefined, now: Date): Session | undefined {
  data.sessions = data.sessions.filter((s) => new Date(s.expiresAt).getTime() > now.getTime());
  if (!key) return undefined;
  const hash = hashKey(key);
  return data.sessions.find((s) => s.idHash === hash);
}

export function deleteSessions(data: Data, predicate: (s: Session) => boolean): void {
  data.sessions = data.sessions.filter((s) => !predicate(s));
}

export async function stillMember(api: Api, store: Store, session: Session, now: Date): Promise<boolean> {
  const { data } = store;
  if (data.chatId === null) return false;
  const last = new Date(session.checkedAt).getTime();
  if (now.getTime() - last < MEMBERSHIP_CHECK_MINUTES * MINUTE) return true;

  const ok = await isGroupMember(api, data.chatId, session.telegramId);
  if (ok) {
    session.checkedAt = now.toISOString();
  } else {
    deleteSessions(data, (s) => s.telegramId === session.telegramId);
  }
  await store.save();
  return ok;
}
