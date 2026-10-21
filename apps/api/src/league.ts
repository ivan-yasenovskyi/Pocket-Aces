import type { Api } from "grammy";
import {
  LEAGUE_BUSY_SYNC_MINUTES,
  LEAGUE_BUSY_WEEKDAY,
  LEAGUE_SYNC_MINUTES,
  LEAGUE_TABLE_URL,
  LEAGUE_TEAM_NAME,
  LEAGUE_URL,
} from "./config.ts";
import type { Data, Match, Score, StandingRow, Store } from "./storage.ts";
import { formatWhen, zonedDate, zonedParts } from "./time.ts";

export function leagueSyncDue(now: Date, lastSync: Date | null): boolean {
  if (!lastSync) return true;
  const busy = zonedParts(now).weekday === LEAGUE_BUSY_WEEKDAY;
  const every = (busy ? LEAGUE_BUSY_SYNC_MINUTES : LEAGUE_SYNC_MINUTES) * 60_000;
  return now.getTime() - lastSync.getTime() >= every;
}

export interface LeagueMatch {
  round: number;
  home: string;
  away: string;
  startsAt: Date | null;
  sector: string;
  result: Score | null;
  sets: Score[];
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
};

function clean(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(amp|quot|#39|lt|gt|nbsp);/g, (entity) => ENTITIES[entity])
    .replace(/\s+/g, " ")
    .trim();
}

const TOKEN =
  /(\d+)\s+kolejka\s*\(|<h5 class="card-title">([\s\S]*?)<\/h5>\s*<p class="card-text">([\s\S]*?)<\/p>\s*<p class="card-footer">([\s\S]*?)<\/p>\s*<p class="card-footer">([\s\S]*?)<\/p>/g;

export function parseLeague(html: string): LeagueMatch[] {
  const matches: LeagueMatch[] = [];
  let round = 0;

  for (const token of html.matchAll(TOKEN)) {
    if (token[1]) {
      round = Number(token[1]);
      continue;
    }
    const [home = "", away = ""] = clean(token[2]).split(/\s+-\s+/);
    if (!home || !away) continue;

    const info = clean(token[3]);
    const when = info.match(/(\d{4})-(\d{2})-(\d{2})\s+godz\.\s*(\d{1,2})[.:](\d{2})/);
    const startsAt = when
      ? zonedDate(Number(when[1]), Number(when[2]), Number(when[3]), Number(when[4]), Number(when[5]))
      : null;
    const sector = info.match(/sektor\s*(.*)$/i)?.[1].trim() ?? "";

    const score = clean(token[4]).match(/^(\d+)\s*:\s*(\d+)$/);
    const sets = [...clean(token[5]).matchAll(/(\d+)\s*:\s*(\d+)/g)]
      .map((s) => ({ us: Number(s[1]), them: Number(s[2]) }))
      .filter((s) => s.us + s.them > 0);

    matches.push({
      round,
      home,
      away,
      startsAt,
      sector,
      result: score ? { us: Number(score[1]), them: Number(score[2]) } : null,
      sets,
    });
  }
  return matches;
}

function isUs(team: string): boolean {
  return team.toLowerCase().includes(LEAGUE_TEAM_NAME.toLowerCase());
}

export function venue(sector: string): string {
  if (/47/.test(sector)) return "Hala 47 LO, ul. Czernika 1/3";
  if (/^[A-Z]$/i.test(sector)) return `SP 205, ul. Dąbrówki 1 · sektor ${sector.toUpperCase()}`;
  return sector ? `SP 205, ul. Dąbrówki 1 · ${sector}` : "SP 205, ul. Dąbrówki 1";
}

export interface LeagueChanges {
  added: Match[];
  moved: { match: Match; before: { startsAt: string; place: string } }[];
}

export function applyLeague(data: Data, list: LeagueMatch[]): LeagueChanges {
  const changes: LeagueChanges = { added: [], moved: [] };

  for (const lm of list) {
    const home = isUs(lm.home);
    if ((!home && !isUs(lm.away)) || !lm.startsAt) continue;

    const opponent = home ? lm.away : lm.home;
    const ours = (s: Score): Score => (home ? s : { us: s.them, them: s.us });
    const id = `league:${lm.round}:${opponent.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")}`;
    const startsAt = lm.startsAt.toISOString();
    const place = venue(lm.sector);
    const sets = lm.sets.map(ours);
    const result = lm.result ? ours(lm.result) : null;

    const existing = data.matches.find((m) => m.id === id);
    if (!existing) {
      const match: Match = {
        id,
        startsAt,
        opponent,
        place,
        result,
        source: "league",
        round: lm.round,
        home,
        sector: lm.sector,
        sets,
        poll: null,
        lineup: null,
      };
      data.matches.push(match);
      changes.added.push(match);
      continue;
    }

    if (existing.startsAt !== startsAt || existing.place !== place) {
      changes.moved.push({ match: existing, before: { startsAt: existing.startsAt, place: existing.place } });
      existing.startsAt = startsAt;
      existing.place = place;
      existing.sector = lm.sector;
    }
    if (result) existing.result = result;
    if (sets.length > 0) existing.sets = sets;
  }
  return changes;
}

export function parseStandings(html: string): StandingRow[] {
  const rows: StandingRow[] = [];
  for (const tr of html.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
    const cells = [...tr[0].matchAll(/<td[\s\S]*?<\/td>/gi)].map((td) => clean(td[0])).filter(Boolean);
    if (cells.length !== 6 || !/^\d+$/.test(cells[0])) continue;
    const [position, team, matches, points, setsWon, setsLost] = cells;
    if (![matches, points, setsWon, setsLost].every((n) => /^\d+$/.test(n))) continue;
    rows.push({
      position: Number(position),
      team,
      matches: Number(matches),
      points: Number(points),
      setsWon: Number(setsWon),
      setsLost: Number(setsLost),
    });
  }
  return rows.sort((a, b) => a.position - b.position);
}

export async function fetchStandings(url = LEAGUE_TABLE_URL): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "PocketAcesBot/1.0 (+https://t.me/pocketaces_helper_bot)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`siatka-lodzkie.org відповів ${res.status}`);
  return decodeTable(new Uint8Array(await res.arrayBuffer()));
}

export function decodeTable(bytes: Uint8Array): string {
  const utf16 = bytes[0] === 0xff && bytes[1] === 0xfe;
  return new TextDecoder(utf16 ? "utf-16le" : "windows-1250").decode(bytes);
}

export async function syncStandings(store: Store, load: () => Promise<string> = () => fetchStandings()): Promise<number> {
  const rows = parseStandings(await load());
  if (rows.length === 0) throw new Error("Таблиця ліги порожня — можливо, змінився документ");
  store.data.standings = { updatedAt: new Date().toISOString(), rows };
  await store.save();
  return rows.length;
}

export async function fetchLeague(url = LEAGUE_URL): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "PocketAcesBot/1.0 (+https://t.me/pocketaces_helper_bot)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`siatka-lodzkie.org відповів ${res.status}`);
  return res.text();
}

export async function syncLeague(
  api: Api,
  store: Store,
  load: () => Promise<string> = () => fetchLeague(),
): Promise<LeagueChanges> {
  const list = parseLeague(await load());
  if (list.length === 0) throw new Error("У terminarzu не знайшлося жодного матчу — можливо, змінилась сторінка ліги");

  const changes = applyLeague(store.data, list);
  await store.save();

  for (const { match, before } of changes.moved) {
    const poll = match.poll;
    if (!poll || poll.closed) continue;
    await api.sendMessage(
      poll.chatId,
      `⚠️ Зміна в terminarzu! Матч проти ${match.opponent}:\nбуло ${formatWhen(new Date(before.startsAt))} · ${before.place}\nстало ${formatWhen(new Date(match.startsAt))} · ${match.place}`,
      { reply_parameters: { message_id: poll.messageId, allow_sending_without_reply: true } },
    );
  }
  return changes;
}
