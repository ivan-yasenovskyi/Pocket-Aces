import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type Answer = "yes" | "no" | "maybe";

export interface Member {
  id: number;
  name: string;
  username?: string;
}

export interface Slot {
  weekday: number;
  hour: number;
  minute: number;
  place: string;
}

export interface Training {
  id: string;
  chatId: number;
  startsAt: string;
  place: string;
  source: "schedule" | "manual";
  pollId: string;
  messageId: number;
  votes: Record<string, Answer>;
  cancelled: boolean;
  reminded: boolean;
  closed: boolean;
}

export interface LoginToken {
  token: string;
  browserKeyHash: string;
  createdAt: string;
  status: "pending" | "confirmed" | "denied";
  telegramId?: number;
}

export interface Session {
  idHash: string;
  telegramId: number;
  createdAt: string;
  expiresAt: string;
  checkedAt: string;
}

export interface Score {
  us: number;
  them: number;
}

export interface MatchPoll {
  chatId: number;
  pollId: string;
  messageId: number;
  votes: Record<string, Answer>;
  reminded: boolean;
  remindedDayBefore?: boolean;
  closed: boolean;
}

export interface Lineup {
  positions: Record<string, string | null>;
  libero: string | null;
}

export interface Match {
  id: string;
  startsAt: string;
  opponent: string;
  place: string;
  result: Score | null;
  source?: "manual" | "league";
  round?: number;
  home?: boolean;
  sector?: string;
  sets?: Score[];
  poll?: MatchPoll | null;
  lineup?: Lineup | null;
}

export interface StatLine {
  matchId: string;
  playerNumber: string;
  points: number;
  aces: number;
  blocks: number;
  serve: number | null;
}

export type TeamLevel = "1st" | "2nd" | "3rd" | "independent";

export interface Registration {
  id: string;
  createdAt: string;
  teamName: string;
  city: string;
  level: TeamLevel;
  captainName: string;
  email: string;
  phone: string;
  instagram: string;
  status?: RegistrationStatus;
}

export type RegistrationStatus = "pending" | "paid" | "rejected";

export interface Photo {
  id: string;
  matchId: string;
  fileId: string;
  width: number;
  height: number;
  addedAt: string;
}

export interface StandingRow {
  position: number;
  team: string;
  matches: number;
  points: number;
  setsWon: number;
  setsLost: number;
}

export interface TournamentSettings {
  name?: string;
  date?: string | null;
  place?: string;
  feePln?: number;
  maxTeams?: number;
  registrationOpen?: boolean;
}

export interface CupGroup {
  name: string;
  teams: string[];
}

export interface CupGame {
  id: string;
  stage: "group" | "playoff";
  group: string | null;
  label: string;
  home: string;
  away: string;
  startsAt: string | null;
  court: string;
  sets: Score[];
}

export interface Cup {
  groups: CupGroup[];
  games: CupGame[];
}

export interface Data {
  chatId: number | null;
  slots: Slot[];
  trainings: Training[];
  members: Record<string, Member>;
  links: Record<string, string>;
  loginTokens: LoginToken[];
  sessions: Session[];
  matches: Match[];
  stats: StatLine[];
  registrations: Registration[];
  photos: Photo[];
  standings: { updatedAt: string; rows: StandingRow[] } | null;
  tournament: TournamentSettings;
  cup: Cup;
}

export interface Store {
  data: Data;
  save(): Promise<void>;
}

function emptyData(): Data {
  return {
    chatId: null,
    slots: [],
    trainings: [],
    members: {},
    links: {},
    loginTokens: [],
    sessions: [],
    matches: [],
    stats: [],
    registrations: [],
    photos: [],
    standings: null,
    tournament: {},
    cup: { groups: [], games: [] },
  };
}

export async function openStore(filePath: string): Promise<Store> {
  const data = emptyData();
  try {
    Object.assign(data, JSON.parse(await readFile(filePath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  let queue: Promise<void> = Promise.resolve();

  return {
    data,
    save() {
      queue = queue
        .catch(() => {})
        .then(async () => {
          await mkdir(dirname(filePath), { recursive: true });
          const tmp = `${filePath}.tmp`;
          await writeFile(tmp, JSON.stringify(data, null, 2));
          await rename(tmp, filePath);
        });
      return queue;
    },
  };
}

export function memoryStore(): Store {
  const data = emptyData();
  return { data, save: async () => {} };
}
