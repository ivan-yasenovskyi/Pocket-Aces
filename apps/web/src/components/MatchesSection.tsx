"use client";

import Link from "next/link";
import { useT } from "@/i18n/locale";
import { api, links, type Match } from "@/lib/api";
import { CalendarIcon } from "./CalendarIcon";
import { LeagueTable } from "./LeagueTable";
import { useApi } from "@/lib/useApi";

function useWhen() {
  const t = useT();
  return (iso: string) =>
    new Intl.DateTimeFormat(t.intl, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Warsaw",
    }).format(new Date(iso));
}

function ResultBadge({ match }: { match: Match }) {
  const t = useT();
  if (!match.result) {
    return <span className="text-sm text-muted">{t.matches.pending}</span>;
  }
  const win = match.result.us > match.result.them;
  return (
    <span className="flex items-center gap-3">
      <span
        className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${win ? "bg-[#e2f4ea] text-[#14532d]" : "bg-[#fde8e8] text-[#7f1d1d]"}`}
      >
        {win ? t.matches.win : t.matches.loss}
      </span>
      <span className="font-display text-[32px] leading-none font-black text-navy tabular-nums">
        {match.result.us}:{match.result.them}
      </span>
    </span>
  );
}

export function MatchesSection() {
  const t = useT();
  const when = useWhen();
  const { data, failed } = useApi(api.matches);
  const next = data?.upcoming[0];

  return (
    <section id="matches" className="bg-white px-8 py-24 max-[560px]:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <h2 className="font-display text-[96px] leading-[0.9] font-black text-navy uppercase max-[560px]:text-[64px]">
            {t.matches.title}
          </h2>
          <a
            href={links.matchesCalendar}
            className="inline-flex min-h-12 items-center gap-2.5 rounded-full border-2 border-navy px-5.5 text-[15px] font-bold text-navy transition-colors duration-200 hover:bg-navy hover:text-white"
          >
            <CalendarIcon />
            {t.calendar.matches}
          </a>
        </div>

        {failed ? (
          <p className="mt-8 text-base text-muted">{t.matches.error}</p>
        ) : (
          <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-6">
            <div className="relative overflow-hidden rounded-[20px] bg-navy p-8 text-white">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[700px] opacity-22"
              />
              <div className="relative">
                <p className="text-sm text-[#bfe6f8]">{t.matches.next}</p>
                {next ? (
                  <>
                    <p className="mt-3 font-display text-[56px] leading-[0.9] font-black uppercase">
                      Pocket Aces
                      <span className="block text-ball">vs {next.opponent}</span>
                    </p>
                    <p className="mt-5 text-lg text-[#e3f4fd]">
                      {when(next.startsAt)}
                      {next.place && ` · ${next.place}`}
                    </p>
                    <Link
                      href="/mecz"
                      className="mt-6 inline-flex min-h-12 items-center rounded-full bg-ball px-6 text-base font-bold text-ink transition-[translate] duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
                    >
                      {t.matches.details}
                    </Link>
                  </>
                ) : (
                  <p className="mt-3 text-lg text-[#e3f4fd]">{data ? t.matches.noUpcoming : "…"}</p>
                )}
                {data && data.upcoming.length > 1 && (
                  <ul className="mt-6 flex flex-col gap-2 border-t border-white/16 pt-4 text-[15px] text-[#e3f4fd]">
                    {data.upcoming.slice(1, 4).map((match) => (
                      <li key={match.id}>
                        {when(match.startsAt)} · vs {match.opponent}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="rounded-[20px] bg-ice p-8">
              <p className="text-sm text-muted">{t.matches.recent}</p>
              {data && data.recent.length > 0 ? (
                <ul className="mt-3 flex flex-col">
                  {data.recent.map((match) => (
                    <li
                      key={match.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#d3ecf9] py-4 last:border-b-0"
                    >
                      <span>
                        <span className="block font-bold">vs {match.opponent}</span>
                        <span className="text-sm text-muted">{when(match.startsAt)}</span>
                        {match.sets.length > 0 && (
                          <span className="block text-sm text-muted tabular-nums">
                            {match.sets.map((s) => `${s.us}:${s.them}`).join(", ")}
                          </span>
                        )}
                      </span>
                      <ResultBadge match={match} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-lg text-[#24456e]">{data ? t.matches.noResults : "…"}</p>
              )}
            </div>
          </div>
        )}
        <div className="mt-6">
          <LeagueTable />
        </div>
      </div>
    </section>
  );
}
