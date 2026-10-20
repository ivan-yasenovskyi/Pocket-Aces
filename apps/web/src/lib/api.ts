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

export interface Me {
  user: { telegramId: number; name: string; username: string | null };
  playerNumber: string | null;
  takenNumbers: string[];
  nextTraining: NextTraining | null;
  attendance: {
    items: { startsAt: string; answer: Answer | null }[];
    present: number;
    total: number;
  };
}

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
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
  if (!res.ok) throw new ApiError(res.status, String(body.error ?? "unknown"));
  return body as T;
}

export const api = {
  me: () => request<Me>("/api/me"),
  choosePlayer: (number: string) =>
    request<Me>("/api/me/player", { method: "POST", body: JSON.stringify({ number }) }),
  answer: (trainingId: string, answer: "yes" | "no") =>
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
