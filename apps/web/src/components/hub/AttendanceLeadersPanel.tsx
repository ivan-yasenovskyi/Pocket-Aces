"use client";

import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { panel } from "./styles";

export function AttendanceLeadersPanel() {
  const { data } = useApi(api.teamLeaders);
  if (!data || data.total === 0) return null;

  return (
    <section aria-labelledby="leaders-hub-title" className={panel}>
      <h2 id="leaders-hub-title" className="text-lg font-bold">
        Najsumienniejsi na treningach
      </h2>
      <p className="mt-0.5 text-sm text-[#5d7a9c]">Ostatnie {data.total} treningów</p>
      <ol className="mt-3 flex flex-col">
        {data.rows.map((row, i) => (
          <li key={row.name} className="flex items-center gap-3 border-t border-[#e3f1fa] py-2.5 first:border-t-0">
            <span className={`w-6 font-display text-2xl font-black tabular-nums ${i === 0 ? "text-ball" : "text-muted"}`}>{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-semibold">
              {row.playerNumber && <span className="mr-2 font-display text-lg font-black text-navy">#{row.playerNumber}</span>}
              {row.name}
            </span>
            <span className="tabular-nums text-muted">
              {row.present}/{data.total}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
