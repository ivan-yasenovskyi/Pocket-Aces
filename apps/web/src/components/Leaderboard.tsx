"use client";

import Image from "next/image";
import Link from "next/link";
import { players } from "@/data/players";
import { useT } from "@/i18n/locale";
import { api, type LeaderEntry } from "@/lib/api";
import { useApi } from "@/lib/useApi";

function Column({ title, entries }: { title: string; entries: LeaderEntry[] }) {
  const t = useT();
  return (
    <section className="rounded-[20px] bg-white p-6 shadow-[0_1px_0_rgba(2,51,107,0.06),0_18px_40px_-30px_rgba(2,51,107,0.45)]">
      <h3 className="text-lg font-bold">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">{t.leaders.empty}</p>
      ) : (
        <ol className="mt-3 flex flex-col">
          {entries.map((entry, i) => {
            const player = players.find((p) => p.number === entry.number);
            return (
              <li key={entry.number} className="border-t border-[#e3f1fa] first:border-t-0">
                <Link href={`/team/${entry.number}`} className="flex min-h-14 items-center gap-3 py-2 hover:text-mid">
                  <span className={`w-6 font-display text-2xl font-black tabular-nums ${i === 0 ? "text-ball" : "text-muted"}`}>{i + 1}</span>
                  <span className="relative size-10 flex-none overflow-hidden rounded-full bg-sky">
                    {player && <Image src={player.image} alt="" fill sizes="40px" className="object-cover object-[50%_8%]" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{player?.name ?? `#${entry.number}`}</span>
                    <span className="text-xs text-muted">
                      #{entry.number} · {entry.matches} {t.leaders.perMatch}
                    </span>
                  </span>
                  <span className="font-display text-[32px] leading-none font-black text-navy tabular-nums">{entry.value}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function Leaderboard() {
  const t = useT().leaders;
  const { data } = useApi(api.leaderboard);

  return (
    <section aria-labelledby="leaders-title" className="mx-auto max-w-7xl">
      <h2 id="leaders-title" className="font-display text-[56px] leading-[0.9] font-black text-navy uppercase max-[560px]:text-[40px]">
        {t.title}
      </h2>
      <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-6">
        <Column title={t.points} entries={data?.points ?? []} />
        <Column title={t.aces} entries={data?.aces ?? []} />
        <Column title={t.blocks} entries={data?.blocks ?? []} />
      </div>
    </section>
  );
}
