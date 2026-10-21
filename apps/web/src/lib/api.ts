export type Answer = "yes" | "no" | "maybe";

export interface NextTraining {
  id: string;
  startsAt: string;
  place: string;
  myAnswer: Answer | null;
  counts: Record<Answer, number>;
  going: string[];
  pollUrl: string | null;
}

export interface UpcomingTraining {
  id: string;
  startsAt: string;
  place: string;
  myAnswer: Answer | null;
  counts: Record<Answer, number>;
}

export interface Me {
  user: { telegramId: number; name: string; username: string | null };
  isCaptain: boolean;
  playerNumber: string | null;
  takenNumbers: string[];
  nextTraining: NextTraining | null;
  upcoming: UpcomingTraining[];
  attendance: {
    items: { startsAt: string; answer: Answer | null }[];
    present: number;
    total: number;
  };
}

export interface TeamAttendance {
  total: number;
  nextStartsAt: string | null;
  rows: { name: string; playerNumber: string | null; present: number; nextAnswer: Answer | null }[];
}

export interface SeasonStats {
  points: number;
  aces: number;
  blocks: number;
  matches: number;
  serve: number | null;
}

export interface Score {
  us: number;
  them: number;
}

export interface Match {
  id: string;
  startsAt: string;
  opponent: string;
  place: string;
  result: Score | null;
  round: number | null;
  home: boolean;
  sector: string | null;
  sets: Score[];
}

export interface Lineup {
  positions: Record<string, string | null>;
  libero: string | null;
}

export interface PhotoRef {
  id: string;
  width: number;
  height: number;
}

export interface CurrentMatch {
  match: Match | null;
  live?: boolean;
  poll?: Record<Answer, number> | null;
  going?: string[];
  goingUnlinked?: number;
  lineup?: Lineup | null;
  photos?: PhotoRef[];
}

export interface StandingRow {
  position: number;
  team: string;
  matches: number;
  points: number;
  setsWon: number;
  setsLost: number;
}

export interface LeaderEntry {
  number: string;
  value: number;
  matches: number;
}

export interface Leaderboard {
  points: LeaderEntry[];
  aces: LeaderEntry[];
  blocks: LeaderEntry[];
}

export interface PlayerSeason {
  number: string;
  totals: SeasonStats | null;
  games: { match: Match; points: number; aces: number; blocks: number; serve: number | null }[];
}

export interface TeamLeaders {
  total: number;
  rows: { name: string; playerNumber: string | null; present: number }[];
}

export interface CupGameView {
  id: string;
  stage: "group" | "playoff";
  group: string | null;
  label: string;
  home: string;
  away: string;
  startsAt: string | null;
  court: string;
  sets: Score[];
  winner: "home" | "away" | null;
}

export interface CupView {
  groups: {
    name: string;
    table: { team: string; played: number; won: number; lost: number; points: number; setsWon: number; setsLost: number }[];
  }[];
  games: CupGameView[];
}

export type RegistrationStatus = "pending" | "paid" | "rejected";

export interface AdminRegistration {
  id: string;
  createdAt: string;
  teamName: string;
  city: string;
  level: TeamLevel;
  captainName: string;
  email: string;
  phone: string;
  instagram: string;
  status: RegistrationStatus;
}

export interface StatLineInput {
  playerNumber: string;
  points: number;
  aces: number;
  blocks: number;
  serve: number | null;
}

export interface AdminMatch extends Match {
  source: "manual" | "league";
  stats: StatLineInput[];
  photos: PhotoRef[];
}

export interface TournamentSettings {
  name: string;
  date: string | null;
  place: string;
  feePln: number;
  maxTeams: number;
  registrationOpen: boolean;
}

export interface AdminOverview {
  matches: AdminMatch[];
  tournament: TournamentSettings;
  registrations: AdminRegistration[];
  cup: CupView & { raw: { groups: { name: string; teams: string[] }[]; games: { id: string; home: string; away: string }[] } };
}

export interface Tournament {
  name: string;
  date: string | null;
  place: string;
  feePln: number;
  maxTeams: number;
  registrationOpen: boolean;
  registered: number;
  confirmed?: number;
  spotsLeft: number;
  teams: { name: string; city: string }[];
  cup?: CupView;
}

export type TeamLevel = "1st" | "2nd" | "3rd" | "independent";

export interface RegistrationForm {
  teamName: string;
  city: string;
  level: TeamLevel;
  captainName: string;
  email: string;
  phone: string;
  instagram: string;
  consent: boolean;
  website: string;
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, public field?: string) {
    super(code);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, String(body.error ?? "unknown"), typeof body.field === "string" ? body.field : undefined);
  }
  return body as T;
}

export const api = {
  me: () => request<Me>("/api/me"),
  teamAttendance: () => request<TeamAttendance>("/api/team/attendance"),
  matches: () => request<{ upcoming: Match[]; recent: Match[] }>("/api/matches"),
  currentMatch: () => request<CurrentMatch>("/api/match/current"),
  standings: () => request<{ updatedAt: string | null; rows: StandingRow[] }>("/api/standings"),
  leaderboard: () => request<Leaderboard>("/api/leaderboard"),
  player: (number: string) => request<PlayerSeason>(`/api/players/${encodeURIComponent(number)}`),
  teamLeaders: () => request<TeamLeaders>("/api/team/leaders"),
  latestPhotos: () => request<{ match: Match | null; photos: PhotoRef[] }>("/api/photos/latest"),
  admin: {
    overview: () => request<AdminOverview>("/api/admin/overview"),
    post: (path: string, body: unknown) =>
      request<AdminOverview>(`/api/admin/${path}`, { method: "POST", body: JSON.stringify(body) }),
  },
  saveLineup: (matchId: string, lineup: Lineup) =>
    request<CurrentMatch>(`/api/match/${encodeURIComponent(matchId)}/lineup`, {
      method: "POST",
      body: JSON.stringify(lineup),
    }),
  stats: () => request<{ stats: Record<string, SeasonStats> }>("/api/stats"),
  tournament: () => request<Tournament>("/api/tournament"),
  register: (form: RegistrationForm) =>
    request<Tournament & { ok: true }>("/api/tournament/registrations", { method: "POST", body: JSON.stringify(form) }),
  choosePlayer: (number: string) =>
    request<Me>("/api/me/player", { method: "POST", body: JSON.stringify({ number }) }),
  answer: (trainingId: string, answer: Answer) =>
    request<Me>(`/api/trainings/${encodeURIComponent(trainingId)}/answer`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),
  startLogin: () => request<{ token: string; link: string }>("/api/auth/telegram", { method: "POST", body: "{}" }),
  loginStatus: (token: string) =>
    request<{ status: "pending" | "ok" | "denied" | "expired" }>(`/api/auth/telegram/${encodeURIComponent(token)}`),
  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST", body: "{}" }),
};

const weekdayFormat = new Intl.DateTimeFormat("pl-PL", { weekday: "long", timeZone: "Europe/Warsaw" });
const dayFormat = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", timeZone: "Europe/Warsaw" });
const timeFormat = new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" });

export function formatTraining(iso: string): string {
  const date = new Date(iso);
  const weekday = weekdayFormat.format(date);
  return `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${dayFormat.format(date)}, ${timeFormat.format(date)}`;
}

const plural = new Intl.PluralRules("pl-PL");

export function comingText(n: number): string {
  const form = plural.select(n);
  if (form === "one") return `Przychodzi ${n} zawodnik`;
  if (form === "few") return `Przychodzą ${n} zawodnicy`;
  return `Przychodzi ${n} zawodników`;
}

export const links = {
  matchesCalendar: "/api/calendar/matches.ics",
  matchCalendar: (id: string) => `/api/calendar/match/${encodeURIComponent(id)}`,
  trainingsCalendar: "/api/calendar/trainings.ics",
  photo: (id: string) => `/api/photos/${encodeURIComponent(id)}`,
};
