import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Api } from "grammy";
import type { Photo } from "./storage.ts";

export type DownloadFile = (fileId: string) => Promise<Uint8Array>;

export function telegramDownloader(api: Api, token: string): DownloadFile {
  return async (fileId) => {
    const file = await api.getFile(fileId);
    if (!file.file_path) throw new Error("Telegram не повернув шлях до файлу");
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`Telegram відповів ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  };
}

export async function photoBytes(dir: string, photo: Photo, download: DownloadFile): Promise<Uint8Array> {
  const path = join(dir, `${photo.id}.jpg`);
  try {
    return new Uint8Array(await readFile(path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const bytes = await download(photo.fileId);
  await mkdir(dir, { recursive: true });
  await writeFile(path, bytes);
  return bytes;
}
