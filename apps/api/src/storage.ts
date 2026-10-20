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

export interface Data {
  chatId: number | null;
  slots: Slot[];
  trainings: Training[];
  members: Record<string, Member>;
  links: Record<string, string>;
  loginTokens: LoginToken[];
  sessions: Session[];
}

export interface Store {
  data: Data;
  save(): Promise<void>;
}

function emptyData(): Data {
  return { chatId: null, slots: [], trainings: [], members: {}, links: {}, loginTokens: [], sessions: [] };
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
