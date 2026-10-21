import { zonedDate, zonedParts } from "../time.ts";

export interface ParsedTraining {
  startsAt: Date;
  place: string;
}

export interface ParsedSlot {
  weekday: number;
  hour: number;
  minute: number;
  place: string;
}

const WEEKDAY_ALIASES: Record<string, number> = {
  пн: 1, понеділок: 1,
  вт: 2, вівторок: 2,
  ср: 3, середа: 3,
  чт: 4, четвер: 4,
  пт: 5, "п'ятниця": 5, "пʼятниця": 5, пятниця: 5,
  сб: 6, субота: 6,
  нд: 7, неділя: 7,
};

function parseTime(hourText: string, minuteText: string): { hour: number; minute: number } | null {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function parseTraining(
  text: string,
  now: Date,
  usage = "Формат: /trening 24.10 19:00 Назва залу",
): ParsedTraining | { error: string } {
  const match = text.trim().match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2}|\d{4}))?\s+(\d{1,2})[:.](\d{2})(?:\s+(.+))?$/);
  if (!match) return { error: usage };

  const [, dayText, monthText, yearText, hourText, minuteText, placeText] = match;
  const time = parseTime(hourText, minuteText);
  if (!time) return { error: `Неправильний час. ${usage}` };

  const day = Number(dayText);
  const month = Number(monthText);
  const today = zonedParts(now);
  let year = yearText ? Number(yearText.length === 2 ? `20${yearText}` : yearText) : today.year;

  let startsAt = zonedDate(year, month, day, time.hour, time.minute);
  if (!yearText && startsAt.getTime() < now.getTime() - 24 * 3600_000) {
    year += 1;
    startsAt = zonedDate(year, month, day, time.hour, time.minute);
  }

  const check = zonedParts(startsAt);
  if (check.day !== day || check.month !== month) {
    return { error: `Такої дати не існує. ${usage}` };
  }
  if (startsAt.getTime() <= now.getTime()) {
    return { error: "Цей час уже минув." };
  }

  return { startsAt, place: (placeText ?? "").trim() };
}

export function parseSlot(text: string): ParsedSlot | { error: string } {
  const usage = "Формат: /rozklad_dodaty вт 19:00 Назва залу (дні: пн вт ср чт пт сб нд)";
  const match = text.trim().match(/^(\S+)\s+(\d{1,2})[:.](\d{2})(?:\s+(.+))?$/);
  if (!match) return { error: usage };

  const [, dayText, hourText, minuteText, placeText] = match;
  const weekday = WEEKDAY_ALIASES[dayText.toLowerCase()];
  if (!weekday) return { error: `Не знаю такого дня. ${usage}` };

  const time = parseTime(hourText, minuteText);
  if (!time) return { error: `Неправильний час. ${usage}` };

  return { weekday, ...time, place: (placeText ?? "").trim() };
}

export interface ParsedMatch {
  startsAt: Date;
  opponent: string;
  place: string;
}

export function parseMatch(text: string, now: Date): ParsedMatch | { error: string } {
  const usage = "Формат: /match 02.11 18:00 Суперник | Зал";
  const parsed = parseTraining(text, now, usage);
  if ("error" in parsed) return parsed;
  const [opponent = "", place = ""] = parsed.place.split("|").map((part) => part.trim());
  if (!opponent) return { error: `Вкажи суперника. ${usage}` };
  return { startsAt: parsed.startsAt, opponent, place };
}

export function parseScore(text: string): { us: number; them: number } | null {
  const match = text.trim().match(/^(\d)\s*[:-]\s*(\d)$/);
  if (!match) return null;
  return { us: Number(match[1]), them: Number(match[2]) };
}

export interface ParsedStatLine {
  playerNumber: string;
  points: number;
  aces: number;
  blocks: number;
  serve: number | null;
}

export function parseStatLine(text: string): ParsedStatLine | { error: string } {
  const usage = "Формат: /pokaznyky 11 12 2 1 87 (номер, очки, ейси, блоки, подача % — необов'язково)";
  const match = text.trim().match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s+(\d{1,3}))?$/);
  if (!match) return { error: usage };
  const serve = match[5] === undefined ? null : Number(match[5]);
  if (serve !== null && serve > 100) return { error: `Подача — це відсоток від 0 до 100. ${usage}` };
  return {
    playerNumber: match[1],
    points: Number(match[2]),
    aces: Number(match[3]),
    blocks: Number(match[4]),
    serve,
  };
}
