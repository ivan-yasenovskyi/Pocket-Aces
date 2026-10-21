"use client";

import Image from "next/image";
import type { Player } from "@/data/players";
import { useT } from "@/i18n/locale";
import type { Lineup } from "@/lib/api";

const ROWS = [
  ["4", "3", "2"],
  ["5", "6", "1"],
];

function Token({ player, label, accent = false }: { player: Player | undefined; label: string; accent?: boolean }) {
  const t = useT();

  if (!player) {
    return (
      <div className="flex flex-col items-center gap-1.5 text-center">
        <span className="flex size-18 items-center justify-center rounded-full border-2 border-dashed border-white/60 font-display text-[28px] font-black text-white/70 max-[560px]:size-14">
          {label}
        </span>
        <span className="text-xs text-white/70">{t.match.position} {label}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <span className="relative">
        <span
          className={`relative block size-18 overflow-hidden rounded-full ring-4 max-[560px]:size-14 ${accent ? "bg-ball ring-ball" : "bg-sky ring-white"}`}
        >
          <Image src={player.image} alt="" fill sizes="72px" className="object-cover object-[50%_8%]" />
        </span>
        <span
          className={`absolute -right-1.5 -bottom-1 flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 font-display text-base font-black ${accent ? "bg-ink text-ball" : "bg-ball text-ink"}`}
        >
          {player.number}
        </span>
      </span>
      <span className="max-w-27.5 truncate font-display text-lg leading-none font-extrabold text-white">
        {player.name}
      </span>
      <span className="text-xs leading-none text-[#e3f4fd]">{t.positions[player.position] ?? player.position}</span>
    </div>
  );
}

interface CourtProps {
  lineup: Lineup;
  players: Player[];
}

export function Court({ lineup, players }: CourtProps) {
  const t = useT();
  const byNumber = (number: string | null) => players.find((p) => p.number === number);

  return (
    <div className="flex flex-wrap items-end justify-center gap-6">
      <div className="relative w-full max-w-140">
        <div className="flex items-center gap-3">
          <span className="h-2 flex-1 rounded-full bg-[repeating-linear-gradient(90deg,#fff_0_6px,transparent_6px_12px)] shadow-[0_0_0_2px_rgba(255,255,255,0.4)]" />
          <span className="text-xs font-bold tracking-wider text-white uppercase">{t.match.net}</span>
          <span className="h-2 flex-1 rounded-full bg-[repeating-linear-gradient(90deg,#fff_0_6px,transparent_6px_12px)] shadow-[0_0_0_2px_rgba(255,255,255,0.4)]" />
        </div>

        <div className="relative mt-2 aspect-square overflow-hidden rounded-b-xl border-4 border-t-0 border-white bg-[#e8803a] shadow-[inset_0_0_80px_rgba(0,0,0,0.18)]">
          <div className="absolute inset-x-0 top-1/3 h-1 bg-white" aria-hidden="true" />
          <div className="absolute inset-x-0 top-0 h-1/3 bg-[#d86f2c]" aria-hidden="true" />

          <span className="absolute top-2 left-3 text-[11px] font-bold tracking-wider text-white/80 uppercase">{t.match.front}</span>
          <span className="absolute top-[calc(33.3%+10px)] left-3 text-[11px] font-bold tracking-wider text-white/80 uppercase">{t.match.back}</span>

          <div className="absolute inset-0 grid grid-rows-[1fr_2fr]">
            {ROWS.map((row, i) => (
              <div key={i} className={`grid grid-cols-3 items-center justify-items-center ${i === 0 ? "pt-5" : "pb-4"}`}>
                {row.map((position) => (
                  <Token key={position} label={position} player={byNumber(lineup.positions[position] ?? null)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/12 px-5 py-4">
        <span className="text-xs font-bold tracking-wider text-[#bfe6f8] uppercase">{t.match.libero}</span>
        <Token label="L" player={byNumber(lineup.libero)} accent />
      </div>
    </div>
  );
}
