"use client";

import { api, formatTraining, type Answer } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { panel } from "./styles";

const nextLabels: Record<Answer, string> = { yes: "✅ Będzie", maybe: "🤔 Nie wie", no: "❌ Nie będzie" };

export function TeamAttendancePanel() {
  const { data, failed } = useApi(api.teamAttendance);

  return (
    <section id="team-attendance" aria-labelledby="team-attendance-title" className={panel}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="team-attendance-title" className="text-lg font-bold">
          Frekwencja drużyny
        </h2>
        <span className="rounded-full bg-ball px-2.5 py-0.5 text-xs font-bold text-ink uppercase">Kapitan</span>
      </div>
      <p className="mt-0.5 text-sm text-[#5d7a9c]">
        {data
          ? `Ostatnie ${data.total} treningów${data.nextStartsAt ? ` · najbliższy: ${formatTraining(data.nextStartsAt)}` : ""}`
          : failed
            ? "Nie udało się wczytać danych."
            : "Ładowanie…"}
      </p>

      {data && data.rows.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-120 text-left text-[15px]">
            <thead className="text-sm text-muted">
              <tr>
                <th scope="col" className="py-2 font-semibold">Zawodnik</th>
                <th scope="col" className="py-2 font-semibold">Obecność</th>
                <th scope="col" className="py-2 font-semibold">Najbliższy trening</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => {
                const percent = data.total ? Math.round((row.present / data.total) * 100) : 0;
                return (
                  <tr key={row.name} className="border-t border-[#e3f1fa]">
                    <td className="py-2.5 font-semibold">
                      {row.playerNumber && <span className="mr-2 font-display text-lg font-black text-navy">#{row.playerNumber}</span>}
                      {row.name}
                    </td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2.5">
                        <span className="h-2 w-20 overflow-hidden rounded-full bg-ice">
                          <span className="block h-full rounded-full bg-navy" style={{ width: `${percent}%` }} />
                        </span>
                        <span className="tabular-nums">
                          {row.present}/{data.total}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 text-muted">{row.nextAnswer ? nextLabels[row.nextAnswer] : "⏳ Brak odpowiedzi"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
