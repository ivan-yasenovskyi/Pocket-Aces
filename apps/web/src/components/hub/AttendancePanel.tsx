import type { Me } from "@/lib/api";
import { formatTraining } from "@/lib/api";
import { panel } from "./styles";

export function AttendancePanel({ attendance }: { attendance: Me["attendance"] }) {
  const percent = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : null;

  return (
    <div className={`${panel} flex-[1_1_320px]`}>
      <h2 className="text-lg font-bold">Obecność na treningach</h2>
      <p className="mt-0.5 text-sm text-[#5d7a9c]">
        {attendance.total ? `Ostatnie ${attendance.total} treningów, według ankiety w Telegramie` : "Jeszcze nie było treningów z ankietą"}
      </p>

      {percent !== null && (
        <>
          <div className="mt-4.5 flex flex-wrap items-center gap-4.5">
            <span className="font-display text-[56px] leading-[0.9] font-black text-navy tabular-nums">{percent}%</span>
            <ul aria-label="Ostatnie treningi" className="grid grid-cols-[repeat(6,22px)] gap-2">
              {attendance.items.map((item) => (
                <li
                  key={item.startsAt}
                  aria-label={`${formatTraining(item.startsAt)}: ${item.answer === "yes" ? "obecny" : "nieobecny"}`}
                  className={
                    item.answer === "yes"
                      ? "size-[22px] rounded-full bg-navy"
                      : "size-[22px] rounded-full border-2 border-[#7fa7c8] bg-white"
                  }
                />
              ))}
            </ul>
          </div>
          <div className="mt-4 flex gap-4.5 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="size-3.5 rounded-full bg-navy" /> Obecny
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-3.5 rounded-full border-2 border-[#7fa7c8] bg-white" /> Nieobecny
            </span>
          </div>
        </>
      )}
    </div>
  );
}
