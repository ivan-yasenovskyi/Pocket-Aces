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

export function parseTraining(text: string, now: Date): ParsedTraining | { error: string } {
  const usage = "Формат: /trening 24.10 19:00 Назва залу";
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
