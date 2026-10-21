"use client";

import { CardBack } from "@/components/CardBack";
import { CardFront } from "@/components/CardFront";
import type { Player } from "@/data/players";
import { useT } from "@/i18n/locale";
import type { SeasonStats } from "@/lib/api";

export const cardBase =
  "block size-full cursor-pointer text-left perspective-[1400px] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-[22px] motion-reduce:transition-none";

interface PlayerFlipCardProps {
  player: Player;
  stats: SeasonStats | undefined;
  flipped: boolean;
  onFlip: () => void;
}

export function PlayerFlipCard({ player, stats, flipped, onFlip }: PlayerFlipCardProps) {
  const t = useT();

  return (
    <button
      type="button"
      aria-pressed={flipped}
      aria-label={`${t.roster.flip} ${player.number}`}
      onClick={onFlip}
      className={cardBase}
    >
      <div
        className={`relative size-full transform-3d transition-transform duration-700 ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none ${flipped ? "rotate-y-180" : ""}`}
      >
        <CardFront player={player} size="md" />
        <CardBack className="flex flex-col px-6 py-6.5 text-white">
          <div className="relative flex items-baseline gap-2.5">
            <span className="font-display text-[30px] font-black text-ball">{player.number}</span>
            <span className="font-display text-[26px] font-extrabold">{player.name}</span>
          </div>
          <p className="relative mt-0.5 text-[13px] text-[#bfe6f8]">{t.roster.season}</p>

          {stats ? (
            <>
              <div className="relative mt-5.5 grid grid-cols-2 gap-x-3 gap-y-4.5">
                {[
                  { value: stats.points, label: t.roster.points },
                  { value: stats.aces, label: t.roster.aces },
                  { value: stats.blocks, label: t.roster.blocks },
                  { value: stats.matches, label: t.roster.matches },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="font-display text-[44px] leading-none font-black">{item.value}</p>
                    <p className="text-[13px] text-[#bfe6f8]">{item.label}</p>
                  </div>
                ))}
              </div>

              {stats.serve !== null && (
                <div className="relative mt-auto">
                  <div className="flex justify-between text-[13px] text-[#bfe6f8]">
                    <span>{t.roster.serve}</span>
                    <span>{stats.serve}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/18">
                    <div className="h-full rounded-full bg-ball" style={{ width: `${stats.serve}%` }} />
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="relative mt-auto text-[15px] leading-normal text-[#bfe6f8]">{t.roster.noStats}</p>
          )}
        </CardBack>
      </div>
    </button>
  );
}
