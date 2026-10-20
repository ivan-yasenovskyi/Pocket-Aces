import { TIME_ZONE } from "./config.ts";

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_UK = ["пн", "вт", "ср", "чт", "пт", "сб", "нд"];

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function zonedParts(date: Date): ZonedParts {
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAYS_EN.indexOf(map.weekday) + 1,
  };
}

function offsetMinutes(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const wholeMinute = Math.floor(date.getTime() / 60_000) * 60_000;
  return Math.round((asUtc - wholeMinute) / 60_000);
}

export function zonedDate(year: number, month: number, day: number, hour: number, minute: number): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = guess - offsetMinutes(new Date(guess)) * 60_000;
  return new Date(guess - offsetMinutes(new Date(first)) * 60_000);
}

export function addDays(day: CalendarDay, n: number): CalendarDay {
  const d = new Date(Date.UTC(day.year, day.month - 1, day.day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function weekdayOf(day: CalendarDay): number {
  const w = new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay();
  return w === 0 ? 7 : w;
}

export function weekdayName(weekday: number): string {
  return WEEKDAYS_UK[weekday - 1] ?? "?";
}

export function formatWhen(date: Date): string {
  const p = zonedParts(date);
  return `${weekdayName(p.weekday)}, ${pad(p.day)}.${pad(p.month)} о ${pad(p.hour)}:${pad(p.minute)}`;
}
