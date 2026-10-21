import type { Data, Match, Registration, TeamLevel } from "./storage.ts";

export interface SeasonStats {
  points: number;
  aces: number;
  blocks: number;
  matches: number;
  serve: number | null;
}

export function sortedMatches(data: Data): Match[] {
  return [...data.matches].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function upcomingMatches(data: Data, now: Date): Match[] {
  return sortedMatches(data).filter((m) => new Date(m.startsAt).getTime() > now.getTime());
}

export function recentMatches(data: Data, now: Date, count = 5): Match[] {
  return sortedMatches(data)
    .filter((m) => new Date(m.startsAt).getTime() <= now.getTime())
    .reverse()
    .slice(0, count);
}

export function seasonStats(data: Data): Record<string, SeasonStats> {
  const result: Record<string, SeasonStats> = {};
  const serves: Record<string, number[]> = {};
  for (const line of data.stats) {
    const row = (result[line.playerNumber] ??= { points: 0, aces: 0, blocks: 0, matches: 0, serve: null });
    row.points += line.points;
    row.aces += line.aces;
    row.blocks += line.blocks;
    row.matches += 1;
    if (line.serve !== null) (serves[line.playerNumber] ??= []).push(line.serve);
  }
  for (const [number, list] of Object.entries(serves)) {
    result[number].serve = Math.round(list.reduce((sum, n) => sum + n, 0) / list.length);
  }
  return result;
}

const LEVELS: TeamLevel[] = ["1st", "2nd", "3rd", "independent"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s-]{7,20}$/;

export type RegistrationInput = Omit<Registration, "id" | "createdAt">;

function field(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export function validateRegistration(body: Record<string, unknown>): RegistrationInput | { field: string } {
  const input: RegistrationInput = {
    teamName: field(body, "teamName"),
    city: field(body, "city"),
    level: (LEVELS as string[]).includes(field(body, "level")) ? (field(body, "level") as TeamLevel) : "independent",
    captainName: field(body, "captainName"),
    email: field(body, "email").toLowerCase(),
    phone: field(body, "phone"),
    instagram: field(body, "instagram").replace(/^@/, ""),
  };

  if (input.teamName.length < 2 || input.teamName.length > 100) return { field: "teamName" };
  if (input.city.length > 100) return { field: "city" };
  if (input.captainName.length < 3 || input.captainName.length > 100) return { field: "captainName" };
  if (!EMAIL.test(input.email) || input.email.length > 100) return { field: "email" };
  if (!PHONE.test(input.phone)) return { field: "phone" };
  if (input.instagram.length > 60) return { field: "instagram" };
  if (body.consent !== true) return { field: "consent" };
  return input;
}
