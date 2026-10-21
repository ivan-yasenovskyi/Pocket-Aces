"use client";

import { useState } from "react";
import { CalendarIcon } from "@/components/CalendarIcon";
import { formatTraining, links, type Answer, type UpcomingTraining } from "@/lib/api";
import { panel } from "./styles";

const options: { answer: Answer; label: string; active: string }[] = [
  { answer: "yes", label: "Będę", active: "bg-navy text-white" },
  { answer: "maybe", label: "Nie wiem", active: "bg-[#ffe9a8] text-[#6b4e00]" },
  { answer: "no", label: "Nie", active: "bg-[#fde8e8] text-[#7f1d1d]" },
];

interface UpcomingPanelProps {
  trainings: UpcomingTraining[];
  onAnswer: (trainingId: string, answer: Answer) => Promise<void>;
}

export function UpcomingPanel({ trainings, onAnswer }: UpcomingPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);

  async function answer(id: string, value: Answer) {
    setBusy(id);
    try {
      await onAnswer(id, value);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="text-lg font-bold">Terminarz treningów</h2>
        {trainings.length > 0 && (
          <a href={links.trainingsCalendar} className="inline-flex min-h-11 items-center gap-2 text-[15px] font-bold text-mid underline underline-offset-3">
            <CalendarIcon />
            Dodaj do kalendarza
          </a>
        )}
      </div>
      {trainings.length === 0 ? (
        <p className="mt-2 text-[15px] text-muted">Brak zaplanowanych treningów.</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {trainings.map((training) => (
            <li
              key={training.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-b border-[#e3f1fa] py-3.5 last:border-b-0"
            >
              <div>
                <p className="font-bold">{formatTraining(training.startsAt)}</p>
                <p className="text-sm text-muted">
                  {training.place ? `${training.place} · ` : ""}✅ {training.counts.yes} · 🤔 {training.counts.maybe} · ❌ {training.counts.no}
                </p>
              </div>
              <div role="group" aria-label={`Odpowiedź: ${formatTraining(training.startsAt)}`} className="flex gap-1.5">
                {options.map((option) => (
                  <button
                    key={option.answer}
                    type="button"
                    disabled={busy === training.id}
                    aria-pressed={training.myAnswer === option.answer}
                    onClick={() => answer(training.id, option.answer)}
                    className={`min-h-10 cursor-pointer rounded-full px-3.5 text-sm font-bold transition-colors duration-200 disabled:cursor-wait disabled:opacity-60 ${training.myAnswer === option.answer ? option.active : "bg-ice text-navy hover:bg-[#d3ecf9]"}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
