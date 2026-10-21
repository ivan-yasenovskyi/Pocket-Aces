"use client";

import { useT } from "@/i18n/locale";
import type { CupGameView, CupView as Cup } from "@/lib/api";

function GameRow({ game }: { game: CupGameView }) {
  const t = useT();
  const when = game.startsAt
    ? new Intl.DateTimeFormat(t.intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw" }).format(new Date(game.startsAt))
    : t.cup.timeSoon;
  const won = (side: "home" | "away") => (game.winner === side ? "font-black text-white" : "text-[#e3f4fd]");

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-t border-white/16 py-3">
      <span className="min-w-0">
        <span className={`block truncate ${won("home")}`}>{game.home}</span>
        <span className={`block truncate ${won("away")}`}>{game.away}</span>
      </span>
      <span className="text-right">
        {game.sets.length > 0 ? (
          <span className="font-display text-2xl font-black tabular-nums">
            {game.sets.filter((s) => s.us > s.them).length}:{game.sets.filter((s) => s.them > s.us).length}
          </span>
        ) : (
          <span className="text-sm text-[#bfe6f8]">{when}</span>
        )}
        <span className="block text-xs text-[#bfe6f8] tabular-nums">
          {game.sets.length > 0
            ? game.sets.map((s) => `${s.us}:${s.them}`).join(", ")
            : game.court
              ? `${t.cup.court} ${game.court}`
              : game.label}
        </span>
      </span>
    </li>
  );
}

export function CupView({ cup }: { cup: Cup | undefined }) {
  const t = useT().cup;
  if (!cup) return null;
  const playoff = cup.games.filter((g) => g.stage === "playoff");
  if (cup.groups.length === 0 && playoff.length === 0) return null;

  return (
    <div className="relative mx-auto mt-16 max-w-7xl">
      <h3 className="font-display text-[56px] leading-[0.9] font-black uppercase max-[560px]:text-[40px]">{t.title}</h3>

      <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
        {cup.groups.map((group) => (
          <section key={group.name} aria-label={`${t.group} ${group.name}`} className="rounded-[20px] bg-white/10 p-6">
            <h4 className="font-display text-[32px] leading-none font-black text-ball uppercase">
              {t.group} {group.name}
            </h4>
            <table className="mt-4 w-full text-left text-[15px]">
              <thead className="text-xs text-[#bfe6f8] uppercase">
                <tr>
                  <th scope="col" className="pb-2 font-semibold">#</th>
                  <th scope="col" className="pb-2 font-semibold">{t.team}</th>
                  <th scope="col" className="pb-2 text-right font-semibold">{t.played}</th>
                  <th scope="col" className="pb-2 text-right font-semibold">{t.points}</th>
                  <th scope="col" className="pb-2 text-right font-semibold">{t.sets}</th>
                </tr>
              </thead>
              <tbody>
                {group.table.map((row, i) => (
                  <tr key={row.team} className="border-t border-white/16">
                    <td className="py-2 tabular-nums">{i + 1}</td>
                    <td className="py-2 font-semibold">{row.team}</td>
                    <td className="py-2 text-right tabular-nums">{row.played}</td>
                    <td className="py-2 text-right font-bold tabular-nums">{row.points}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.setsWon}:{row.setsLost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="mt-4">
              {cup.games
                .filter((g) => g.group === group.name)
                .map((game) => (
                  <GameRow key={game.id} game={game} />
                ))}
            </ul>
          </section>
        ))}

        {playoff.length > 0 && (
          <section aria-label={t.playoff} className="rounded-[20px] bg-white/10 p-6">
            <h4 className="font-display text-[32px] leading-none font-black text-ball uppercase">{t.playoff}</h4>
            <ul className="mt-4">
              {playoff.map((game) => (
                <li key={game.id}>
                  <p className="mt-3 text-xs font-bold tracking-wider text-[#bfe6f8] uppercase">{game.label}</p>
                  <ul>
                    <GameRow game={game} />
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
