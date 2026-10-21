"use client";

import Link from "next/link";
import { CardFront } from "@/components/CardFront";
import { Nav } from "@/components/Nav";
import type { Player } from "@/data/players";
import { useT } from "@/i18n/locale";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useCallback } from "react";
import { FormChart } from "./FormChart";

export function PlayerProfile({ player }: { player: Player }) {
  const t = useT();
  const tp = t.player;
  const load = useCallback(() => api.player(player.number), [player.number]);
  const { data } = useApi(load);
  const totals = data?.totals;
  const day = new Intl.DateTimeFormat(t.intl, { day: "2-digit", month: "2-digit", timeZone: "Europe/Warsaw" });

  const tiles = [
    { label: t.roster.points, value: totals?.points },
    { label: t.roster.aces, value: totals?.aces },
    { label: t.roster.blocks, value: totals?.blocks },
    { label: t.roster.matches, value: totals?.matches },
    { label: t.roster.serve, value: totals?.serve === null || totals?.serve === undefined ? undefined : `${totals.serve}%` },
  ];

  return (
    <>
      <header className="relative overflow-hidden bg-linear-to-b from-navy via-mid to-sky pb-16 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[900px_900px] opacity-40" />
        <Nav />
        <div className="relative z-20 mx-auto flex max-w-7xl flex-wrap items-end gap-10 px-8 pt-6 max-[560px]:px-4">
          <div className="relative h-105 w-75 flex-none -rotate-3 animate-rise motion-reduce:animate-none">
            <CardFront player={player} size="lg" eager />
          </div>
          <div className="min-w-0 flex-[1_1_360px] pb-4">
            <Link href="/team" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#e3f4fd] hover:text-white">
              {tp.back}
            </Link>
            <p className="font-display text-[44px] leading-none font-black text-ball">#{player.number}</p>
            <h1 className="font-display text-[120px] leading-[0.84] font-black uppercase max-[560px]:text-[72px]">{player.name}</h1>
            <p className="mt-3 text-xl text-[#e3f4fd]">
              {t.positions[player.position] ?? player.position} · {tp.season}
            </p>
          </div>
        </div>
      </header>

      <main className="bg-ice px-8 py-16 max-[560px]:px-4">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-[20px] bg-white p-6 shadow-[0_1px_0_rgba(2,51,107,0.06),0_18px_40px_-30px_rgba(2,51,107,0.45)]">
                <dt className="text-sm text-muted">{tile.label}</dt>
                <dd className="mt-1 font-display text-[56px] leading-none font-black text-navy tabular-nums">{tile.value ?? "—"}</dd>
              </div>
            ))}
          </dl>

          <section className="rounded-[20px] bg-white p-8 shadow-[0_1px_0_rgba(2,51,107,0.06),0_18px_40px_-30px_rgba(2,51,107,0.45)] max-[560px]:p-5">
            {data && data.games.length === 0 && <p className="text-base text-muted">{tp.noGames}</p>}
            {!data && <p className="text-base text-muted">…</p>}
            {data && data.games.length > 0 && (
              <>
                <FormChart games={data.games} />
                <div className="mt-10 overflow-x-auto">
                  <table className="w-full min-w-120 text-left text-[15px]">
                    <caption className="pb-3 text-left text-lg font-bold">{tp.games}</caption>
                    <thead className="text-xs text-muted uppercase">
                      <tr>
                        <th scope="col" className="pb-2 font-semibold">{tp.date}</th>
                        <th scope="col" className="pb-2 font-semibold">{tp.opponent}</th>
                        <th scope="col" className="pb-2 font-semibold">{tp.result}</th>
                        <th scope="col" className="pb-2 text-right font-semibold">{tp.pointsShort}</th>
                        <th scope="col" className="pb-2 text-right font-semibold">{tp.acesShort}</th>
                        <th scope="col" className="pb-2 text-right font-semibold">{tp.blocksShort}</th>
                        <th scope="col" className="pb-2 text-right font-semibold">{tp.serveShort}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.games].reverse().map((game) => (
                        <tr key={game.match.id} className="border-t border-[#e3f1fa]">
                          <td className="py-2.5 tabular-nums">{day.format(new Date(game.match.startsAt))}</td>
                          <td className="py-2.5 font-semibold">{game.match.opponent}</td>
                          <td className="py-2.5 tabular-nums">
                            {game.match.result ? `${game.match.result.us}:${game.match.result.them}` : "—"}
                          </td>
                          <td className="py-2.5 text-right font-bold tabular-nums">{game.points}</td>
                          <td className="py-2.5 text-right tabular-nums">{game.aces}</td>
                          <td className="py-2.5 text-right tabular-nums">{game.blocks}</td>
                          <td className="py-2.5 text-right tabular-nums">{game.serve === null ? "—" : `${game.serve}%`}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
