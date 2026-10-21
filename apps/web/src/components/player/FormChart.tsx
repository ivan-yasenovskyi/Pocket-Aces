"use client";

import { useT } from "@/i18n/locale";
import type { PlayerSeason } from "@/lib/api";

export function FormChart({ games }: { games: PlayerSeason["games"] }) {
  const t = useT();
  const max = Math.max(1, ...games.map((g) => g.points));
  const best = games.findIndex((g) => g.points === max);
  const day = new Intl.DateTimeFormat(t.intl, { day: "2-digit", month: "2-digit", timeZone: "Europe/Warsaw" });

  return (
    <figure>
      <figcaption className="text-lg font-bold">{t.player.form}</figcaption>
      <div className="relative mt-6 flex h-56 items-end gap-2 border-b border-[#9cc3dd] pt-8" role="list">
        <span className="pointer-events-none absolute top-8 right-0 left-0 border-t border-dashed border-[#d3ecf9]" aria-hidden="true" />
        <span className="absolute top-8 -translate-y-full text-xs text-muted tabular-nums" aria-hidden="true">
          {max}
        </span>
        {games.map((game, i) => (
          <div
            key={game.match.id}
            role="listitem"
            tabIndex={0}
            aria-label={`${day.format(new Date(game.match.startsAt))} vs ${game.match.opponent}: ${game.points} ${t.player.pointsShort}`}
            className="group relative flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end outline-none"
          >
            {i === best && (
              <span className="mb-1 text-sm font-bold text-ink tabular-nums">{game.points}</span>
            )}
            <span
              className="w-full max-w-12 rounded-t-[4px] bg-navy transition-colors duration-150 group-hover:bg-mid group-focus-visible:bg-mid"
              style={{ height: `${(game.points / max) * 100}%`, minHeight: game.points ? 4 : 0 }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-48 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg group-hover:block group-focus-visible:block">
              <span className="block font-bold">vs {game.match.opponent}</span>
              {day.format(new Date(game.match.startsAt))} · {game.points} {t.player.pointsShort} · {game.aces} {t.player.acesShort} ·{" "}
              {game.blocks} {t.player.blocksShort}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2" aria-hidden="true">
        {games.map((game) => (
          <span key={game.match.id} className="min-w-0 flex-1 truncate text-center text-xs text-muted tabular-nums">
            {day.format(new Date(game.match.startsAt))}
          </span>
        ))}
      </div>
    </figure>
  );
}
