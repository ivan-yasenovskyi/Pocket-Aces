"use client";

import { useState } from "react";
import { comingText, formatTraining, type NextTraining } from "@/lib/api";
import { btnGhost, btnNo, btnYes, panel } from "./styles";

interface NextTrainingPanelProps {
  training: NextTraining | null;
  onAnswer: (answer: "yes" | "no") => Promise<void>;
}

export function NextTrainingPanel({ training, onAnswer }: NextTrainingPanelProps) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!training) {
    return (
      <div className={panel}>
        <p className="text-sm text-muted">Najbliższy trening</p>
        <p className="mt-0.5 font-display text-[32px] leading-[1.1] font-extrabold">Brak w terminarzu</p>
        <p className="mt-3.5 text-[15px] text-muted">Gdy kapitan doda trening w Telegramie, pojawi się tutaj.</p>
      </div>
    );
  }

  const answered = training.myAnswer === "yes" || training.myAnswer === "no";
  const showButtons = !answered || editing;

  async function answer(value: "yes" | "no") {
    setBusy(true);
    try {
      await onAnswer(value);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={panel}>
      <p className="text-sm text-muted">Najbliższy trening</p>
      <p className="mt-0.5 font-display text-[32px] leading-[1.1] font-extrabold">{formatTraining(training.startsAt)}</p>
      {training.place && <p className="mt-0.5 text-[15px] text-muted">{training.place}</p>}

      {showButtons && (
        <div>
          <p className="mt-3.5 text-base font-semibold">Będziesz?</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button type="button" disabled={busy} onClick={() => answer("yes")} className={btnYes}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-4.5" aria-hidden="true">
                <path d="M5 12l5 5L20 7" />
              </svg>
              Będę
            </button>
            <button type="button" disabled={busy} onClick={() => answer("no")} className={btnNo}>
              Nie dam rady
            </button>
          </div>
        </div>
      )}

      {!showButtons && training.myAnswer === "yes" && (
        <div role="status" className="mt-3.5 flex animate-pop items-center gap-3 rounded-[14px] bg-[#e2f4ea] p-3.5 text-[#14532d] motion-reduce:animate-none">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-[#1f7a4d] text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-4.5" aria-hidden="true">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          <span className="font-semibold">Jesteś na liście. {comingText(training.counts.yes)}.</span>
        </div>
      )}

      {!showButtons && training.myAnswer === "no" && (
        <div role="status" className="mt-3.5 animate-pop rounded-[14px] bg-ice p-3.5 font-semibold text-[#24456e] motion-reduce:animate-none">
          Jasne, trener wie, że cię nie będzie.
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4">
        {!showButtons && (
          <button type="button" onClick={() => setEditing(true)} className={btnGhost}>
            Zmień odpowiedź
          </button>
        )}
        {training.pollUrl && (
          <a href={training.pollUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>
            Ankieta w Telegramie
          </a>
        )}
      </div>
    </div>
  );
}
