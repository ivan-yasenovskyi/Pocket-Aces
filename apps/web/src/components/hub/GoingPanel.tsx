import type { NextTraining } from "@/lib/api";
import { panelBase } from "./styles";

export function GoingPanel({ training }: { training: NextTraining | null }) {
  return (
    <div className={`${panelBase} relative overflow-hidden bg-navy text-white`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[700px] opacity-22"
      />
      <div className="relative">
        <p className="text-sm text-[#bfe6f8]">Kto przychodzi</p>
        <p className="mt-0.5 font-display text-[32px] leading-[1.1] font-extrabold">
          {training ? `${training.counts.yes} na liście` : "—"}
        </p>
        {training && (
          <p className="mt-0.5 text-[15px] text-[#bfe6f8]">
            Nie przyjdzie: {training.counts.no} · Jeszcze nie wiedzą: {training.counts.maybe}
          </p>
        )}

        <ul className="mt-4.5 flex flex-col gap-2.5">
          {training && training.going.length > 0 ? (
            training.going.map((name) => (
              <li key={name} className="border-t border-white/16 pt-2.5 font-semibold">
                {name}
              </li>
            ))
          ) : (
            <li className="border-t border-white/16 pt-2.5 text-[#bfe6f8]">Na razie nikt się nie zapisał.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
