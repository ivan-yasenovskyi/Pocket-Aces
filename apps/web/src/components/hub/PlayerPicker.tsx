"use client";

import Image from "next/image";
import { useState } from "react";
import { players } from "@/data/players";
import { btnYes, panel } from "./styles";

interface PlayerPickerProps {
  takenNumbers: string[];
  onChoose: (number: string) => Promise<void>;
}

export function PlayerPicker({ takenNumbers, onChoose }: PlayerPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chosen = players.find((p) => p.number === selected);

  async function confirm() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await onChoose(selected);
    } catch {
      setError("Ta karta jest już zajęta albo coś poszło nie tak. Spróbuj inną lub napisz do kapitana.");
      setBusy(false);
    }
  }

  return (
    <section className={panel} aria-labelledby="picker-title">
      <h2 id="picker-title" className="font-display text-[44px] leading-[0.9] font-black text-navy uppercase">
        Kim jesteś w drużynie?
      </h2>
      <p className="mt-2 text-base text-muted">
        Wybierz swoją kartę — robisz to tylko raz. Jeśli się pomylisz, napisz do kapitana.
      </p>

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4">
        {players.map((player) => {
          const taken = takenNumbers.includes(player.number);
          const isSelected = selected === player.number;
          return (
            <button
              key={player.number}
              type="button"
              disabled={taken}
              aria-pressed={isSelected}
              onClick={() => setSelected(player.number)}
              className={`relative flex cursor-pointer flex-col rounded-2xl bg-white p-2.5 text-left ring-2 transition-[translate,box-shadow] duration-200 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 motion-reduce:transition-none ${isSelected ? "shadow-[0_18px_30px_-18px_rgba(2,20,55,0.6)] ring-ball" : "shadow-[0_10px_24px_-20px_rgba(2,20,55,0.6)] ring-[#d3ecf9]"}`}
            >
              <span className="relative block aspect-[3/4] overflow-hidden rounded-xl bg-linear-to-b from-navy to-sky">
                <Image src={player.image} alt="" fill sizes="150px" className="object-contain object-bottom" />
              </span>
              <span className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-2xl leading-none font-black text-navy">{player.number}</span>
                <span className="truncate font-bold">{player.name}</span>
              </span>
              <span className="text-xs text-muted">{taken ? "Zajęta" : player.position}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="button" disabled={!chosen || busy} onClick={confirm} className={btnYes}>
          {chosen ? `To ja: #${chosen.number} ${chosen.name}` : "Wybierz kartę"}
        </button>
        {error && (
          <p role="alert" className="text-[15px] font-semibold text-[#6b4e00]">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
