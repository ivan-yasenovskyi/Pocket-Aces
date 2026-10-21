"use client";

import Link from "next/link";
import { useState } from "react";
import { Leaderboard } from "@/components/Leaderboard";
import { Nav } from "@/components/Nav";
import { PlayerFlipCard } from "@/components/PlayerFlipCard";
import { players } from "@/data/players";
import { useT } from "@/i18n/locale";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

export function TeamGrid() {
  const t = useT();
  const { data } = useApi(api.stats);
  const [flipped, setFlipped] = useState<string[]>([]);

  function toggle(number: string) {
    setFlipped((current) =>
      current.includes(number) ? current.filter((n) => n !== number) : [...current, number],
    );
  }

  return (
    <>
      <header className="relative overflow-hidden bg-linear-to-b from-navy via-mid to-sky pb-14 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[900px_900px] opacity-40"
        />
        <Nav />
        <div className="relative z-20 mx-auto max-w-7xl px-8 pt-6">
          <Link href="/" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#e3f4fd] hover:text-white">
            {t.team.back}
          </Link>
          <h1 className="mt-2 animate-rise font-display text-[120px] leading-[0.84] font-black uppercase motion-reduce:animate-none max-[560px]:text-[72px]">
            {t.team.title}
          </h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-normal text-[#e3f4fd]">{t.team.lead}</p>
        </div>
      </header>

      <main className="flex flex-col gap-16 bg-ice px-8 py-16 max-[560px]:px-4">
        <ul className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fill,260px)] justify-center gap-x-8 gap-y-12">
          {players.map((player) => (
            <li key={player.number} className="flex w-65 flex-col items-center gap-3">
              <div className="h-91 w-65">
                <PlayerFlipCard
                  player={player}
                  stats={data?.stats[player.number]}
                  flipped={flipped.includes(player.number)}
                  onFlip={() => toggle(player.number)}
                />
              </div>
              <Link
                href={`/team/${player.number}`}
                className="inline-flex min-h-11 items-center text-[15px] font-bold text-navy underline underline-offset-3 hover:text-mid"
              >
                {t.player.profile} #{player.number} →
              </Link>
            </li>
          ))}
        </ul>
        <Leaderboard />
      </main>
    </>
  );
}
