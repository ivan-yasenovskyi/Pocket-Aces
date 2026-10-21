"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Nav } from "@/components/Nav";
import { players } from "@/data/players";
import { useT } from "@/i18n/locale";
import { CalendarIcon } from "@/components/CalendarIcon";
import { api, links } from "@/lib/api";
import { emptyLineup } from "@/lib/lineup";
import { useApi } from "@/lib/useApi";
import { Court } from "./Court";
import { Gallery } from "./Gallery";
import { LineupEditor } from "./LineupEditor";

function mapsUrl(place: string): string {
  const address = place.split(" · ")[0];
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Łódź`)}`;
}

function TeamBadge({ name, ours }: { name: string; ours: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
      {ours ? (
        <Image src="/images/logo.webp" alt="" width={485} height={505} className="h-auto w-24 max-[560px]:w-16" loading="eager" />
      ) : (
        <span className="flex size-24 items-center justify-center rounded-full bg-white/14 font-display text-[40px] font-black max-[560px]:size-16 max-[560px]:text-[28px]">
          {name
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
      <span className="font-display text-[34px] leading-none font-black uppercase max-[560px]:text-2xl">{name}</span>
    </div>
  );
}

export function MatchCenter() {
  const t = useT();
  const tm = t.match;
  const { data, failed, setData } = useApi(api.currentMatch);
  const { data: latest } = useApi(api.latestPhotos);
  const [captain, setCaptain] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((me) => setCaptain(me.isCaptain))
      .catch(() => {});
  }, []);

  const match = data?.match ?? null;
  const when = (options: Intl.DateTimeFormatOptions) =>
    match ? new Intl.DateTimeFormat(t.intl, { ...options, timeZone: "Europe/Warsaw" }).format(new Date(match.startsAt)) : "";
  const played = Boolean(match?.result);
  const title = data?.live ? tm.liveTitle : played ? tm.lastTitle : tm.title;
  const lineup = data?.lineup ?? null;
  const going = data?.going ?? [];

  const left = match ? (match.home ? "Pocket Aces" : match.opponent) : "";
  const right = match ? (match.home ? match.opponent : "Pocket Aces") : "";
  const flip = (s: { us: number; them: number }) => (match?.home ? [s.us, s.them] : [s.them, s.us]);

  return (
    <>
      <header className="relative overflow-hidden bg-linear-to-b from-navy via-mid via-58% to-sky pb-16 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 -left-225 h-[calc(100%+900px)] w-[calc(100%+900px)] animate-drift bg-[url(/images/topo.svg)] bg-size-[900px_900px] opacity-40 motion-reduce:animate-none"
        />
        <Nav />

        <div className="relative z-20 mx-auto max-w-5xl px-8 pt-8 max-[560px]:px-4">
          <p className="flex flex-wrap items-center justify-center gap-3 text-center text-sm font-semibold tracking-wider text-[#bfe6f8] uppercase">
            {data?.live && (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#dc2626] px-3 py-1 text-white">
                <span className="size-2 animate-pulse rounded-full bg-white motion-reduce:animate-none" aria-hidden="true" />
                {tm.live}
              </span>
            )}
            <span>
              {title}
              {match?.round ? ` · ${match.round} ${tm.round} · ${tm.league}` : ""}
            </span>
          </p>

          {failed && <p className="mt-10 text-center text-lg">{tm.error}</p>}
          {data && !match && <p className="mt-10 text-center text-lg">{tm.none}</p>}
          {!data && !failed && <p className="mt-10 text-center text-lg">…</p>}

          {match && (
            <>
              <div className="mt-8 flex animate-rise items-center gap-6 motion-reduce:animate-none max-[560px]:gap-3">
                <TeamBadge name={left} ours={match.home} />
                <div className="flex flex-none flex-col items-center">
                  {match.result ? (
                    <span className="font-display text-[88px] leading-none font-black tabular-nums max-[560px]:text-[56px]">
                      {flip(match.result).join(":")}
                    </span>
                  ) : (
                    <span className="font-display text-[64px] leading-none font-black text-ball max-[560px]:text-[44px]">VS</span>
                  )}
                </div>
                <TeamBadge name={right} ours={!match.home} />
              </div>

              {match.sets.length > 0 && (
                <ul aria-label={tm.sets} className="mt-6 flex flex-wrap justify-center gap-2">
                  {match.sets.map((set, i) => {
                    const won = set.us > set.them;
                    return (
                      <li
                        key={i}
                        className={`rounded-full px-3.5 py-1.5 text-[15px] font-bold tabular-nums ${won ? "bg-ball text-ink" : "bg-white/16 text-white"}`}
                      >
                        {flip(set).join(" : ")}
                      </li>
                    );
                  })}
                </ul>
              )}

              <dl className="mt-8 flex flex-wrap justify-center gap-3 text-center">
                <div className="rounded-2xl bg-white/12 px-5 py-3">
                  <dt className="sr-only">Data</dt>
                  <dd className="text-lg font-bold capitalize">{when({ weekday: "long", day: "numeric", month: "long" })}</dd>
                </div>
                <div className="rounded-2xl bg-white/12 px-5 py-3">
                  <dt className="sr-only">Godzina</dt>
                  <dd className="font-display text-[28px] leading-none font-black">{when({ hour: "2-digit", minute: "2-digit" })}</dd>
                </div>
                <div className="rounded-2xl bg-white/12 px-5 py-3">
                  <dt className="sr-only">Miejsce</dt>
                  <dd className="text-lg font-bold">
                    {match.place}{" "}
                    <a href={mapsUrl(match.place)} target="_blank" rel="noopener noreferrer" className="ml-1 font-semibold text-ball underline underline-offset-3">
                      {tm.route}
                    </a>
                  </dd>
                </div>
              </dl>

              {!played && (
                <div className="mt-6 flex justify-center">
                  <a
                    href={links.matchCalendar(match.id)}
                    className="inline-flex min-h-12 items-center gap-2.5 rounded-full border-2 border-white/75 px-5.5 text-[15px] font-bold text-white transition-colors duration-200 hover:bg-white hover:text-ink"
                  >
                    <CalendarIcon />
                    {t.calendar.match}
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </header>

      {match && (
        <main className="bg-ice px-8 py-16 max-[560px]:px-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <section aria-labelledby="lineup-title" className="relative overflow-hidden rounded-[24px] bg-navy px-8 pt-8 pb-10 text-white max-[560px]:px-4">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[700px] opacity-20" />
              <div className="relative flex flex-wrap items-center justify-between gap-4">
                <h2 id="lineup-title" className="font-display text-[56px] leading-[0.9] font-black uppercase max-[560px]:text-[40px]">
                  {tm.lineup}
                </h2>
                {captain && !editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-ball px-5.5 text-base font-bold text-ink transition-[translate] duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
                  >
                    {tm.edit}
                  </button>
                )}
              </div>

              <div className="relative mt-8">
                {editing ? (
                  <LineupEditor
                    matchId={match.id}
                    initial={lineup ?? emptyLineup()}
                    going={going}
                    onSaved={(next) => {
                      setData(next);
                      setEditing(false);
                    }}
                    onCancel={() => setEditing(false)}
                  />
                ) : (
                  <>
                    <Court lineup={lineup ?? emptyLineup()} players={players} />
                    {!lineup && <p className="mt-6 text-center text-[15px] text-[#bfe6f8]">{tm.lineupSoon}</p>}
                  </>
                )}
              </div>
            </section>

            <section aria-labelledby="going-title">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <h2 id="going-title" className="font-display text-[44px] leading-[0.9] font-black text-navy uppercase">
                  {tm.going} {data?.poll ? `(${data.poll.yes})` : ""}
                </h2>
                {data?.poll && (
                  <p className="text-[15px] text-muted">
                    ✅ {data.poll.yes} · 🤔 {data.poll.maybe} · ❌ {data.poll.no}
                  </p>
                )}
              </div>

              {!data?.poll ? (
                <p className="mt-3 text-base text-muted">{tm.pollSoon}</p>
              ) : going.length === 0 && !data.goingUnlinked ? (
                <p className="mt-3 text-base text-muted">{tm.goingNone}</p>
              ) : (
                <ul className="mt-5 flex flex-wrap gap-3">
                  {going.map((number) => {
                    const player = players.find((p) => p.number === number);
                    if (!player) return null;
                    return (
                      <li key={number} className="flex items-center gap-3 rounded-full bg-white py-1.5 pr-4 pl-1.5 shadow-[0_10px_24px_-20px_rgba(2,20,55,0.6)]">
                        <span className="relative size-10 overflow-hidden rounded-full bg-sky">
                          <Image src={player.image} alt="" fill sizes="40px" className="object-cover object-[50%_8%]" />
                        </span>
                        <span className="font-display text-xl font-black text-navy">{player.number}</span>
                        <span className="font-semibold">{player.name}</span>
                      </li>
                    );
                  })}
                  {data.goingUnlinked ? (
                    <li className="flex items-center rounded-full bg-white px-4 py-1.5 text-muted">
                      +{data.goingUnlinked} {tm.goingUnlinked}
                    </li>
                  ) : null}
                </ul>
              )}
            </section>

            {data?.photos && data.photos.length > 0 ? (
              <Gallery title={t.gallery.match} photos={data.photos} />
            ) : latest?.match && latest.photos.length > 0 ? (
              <Gallery title={`${t.gallery.last}: vs ${latest.match.opponent}`} photos={latest.photos} />
            ) : null}

            <p className="text-sm text-muted">
              <a href="https://www.siatka-lodzkie.org/2.html" target="_blank" rel="noopener noreferrer" className="underline underline-offset-3 hover:text-navy">
                {tm.source}
              </a>
            </p>
          </div>
        </main>
      )}
    </>
  );
}
