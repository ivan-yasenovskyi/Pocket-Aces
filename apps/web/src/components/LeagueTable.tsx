"use client";

import { useT } from "@/i18n/locale";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

export function LeagueTable() {
  const t = useT().standings;
  const { data } = useApi(api.standings);
  const rows = data?.rows ?? [];

  return (
    <div className="rounded-[20px] bg-ice p-8 max-[560px]:p-5">
      <h3 className="font-display text-[40px] leading-[0.9] font-black text-navy uppercase">{t.title}</h3>
      {rows.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">{data ? t.empty : "…"}</p>
      ) : (
        <table className="mt-5 w-full text-left text-[15px]">
          <thead className="text-xs text-muted uppercase">
            <tr>
              <th scope="col" className="pb-2 font-semibold">#</th>
              <th scope="col" className="pb-2 font-semibold">{t.team}</th>
              <th scope="col" className="pb-2 text-right font-semibold">{t.matches}</th>
              <th scope="col" className="pb-2 text-right font-semibold">{t.points}</th>
              <th scope="col" className="pb-2 text-right font-semibold">{t.sets}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const ours = row.team.toLowerCase().includes("pocket aces");
              return (
                <tr key={row.team} className={`border-t border-[#d3ecf9] ${ours ? "bg-white font-bold text-navy" : ""}`}>
                  <td className={`py-2.5 pl-2 tabular-nums ${ours ? "rounded-l-lg" : ""}`}>{row.position}</td>
                  <td className="py-2.5">
                    {row.team}
                    {ours && <span className="ml-2 inline-block size-2 rounded-full bg-ball align-middle" aria-hidden="true" />}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{row.matches}</td>
                  <td className="py-2.5 text-right font-bold tabular-nums">{row.points}</td>
                  <td className={`py-2.5 pr-2 text-right tabular-nums ${ours ? "rounded-r-lg" : ""}`}>
                    {row.setsWon}:{row.setsLost}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <a
        href="https://www.siatka-lodzkie.org/2.html"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-3 hover:text-navy"
      >
        {t.source}
      </a>
    </div>
  );
}
