export const card =
  "rounded-[20px] bg-white p-6 shadow-[0_1px_0_rgba(2,51,107,0.06),0_18px_40px_-30px_rgba(2,51,107,0.45)] max-[560px]:p-4";

export const input =
  "mt-1 block min-h-11 w-full rounded-xl border-2 border-[#d3ecf9] bg-white px-3 text-[15px] text-ink outline-none focus:border-mid";

export const numberInput =
  "block min-h-10 w-16 rounded-lg border-2 border-[#d3ecf9] bg-white px-2 text-center text-[15px] text-ink tabular-nums outline-none focus:border-mid";

export const label = "block text-sm font-semibold text-muted";

export const primary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-navy px-5 text-[15px] font-bold text-white transition-[translate] duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none";

export const secondary =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border-2 border-[#b9d9ee] bg-white px-5 text-[15px] font-bold text-navy hover:border-navy disabled:opacity-60";

export const danger =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 text-[15px] font-bold text-[#b91c1c] underline underline-offset-3 hover:text-[#7f1d1d]";

export function localParts(iso: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Warsaw",
  }).format(new Date(iso));
}
