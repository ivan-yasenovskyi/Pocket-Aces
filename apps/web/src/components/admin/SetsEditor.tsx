"use client";

import type { Score } from "@/lib/api";
import { numberInput } from "./ui";

interface SetsEditorProps {
  sets: Score[];
  max: number;
  usLabel: string;
  themLabel: string;
  onChange: (sets: Score[]) => void;
}

export function SetsEditor({ sets, max, usLabel, themLabel, onChange }: SetsEditorProps) {
  const update = (i: number, side: keyof Score, value: string) =>
    onChange(sets.map((s, j) => (j === i ? { ...s, [side]: Math.max(0, Math.min(99, Number(value) || 0)) } : s)));

  return (
    <div>
      <ol className="flex flex-col gap-2">
        {sets.map((set, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-14 text-sm text-muted">Set {i + 1}</span>
            <input
              type="number"
              min={0}
              max={99}
              aria-label={`Set ${i + 1}: ${usLabel}`}
              value={set.us}
              onChange={(e) => update(i, "us", e.target.value)}
              className={numberInput}
            />
            <span className="font-bold">:</span>
            <input
              type="number"
              min={0}
              max={99}
              aria-label={`Set ${i + 1}: ${themLabel}`}
              value={set.them}
              onChange={(e) => update(i, "them", e.target.value)}
              className={numberInput}
            />
            <button
              type="button"
              onClick={() => onChange(sets.filter((_, j) => j !== i))}
              className="min-h-10 cursor-pointer px-2 text-sm text-[#b91c1c] underline"
              aria-label={`Usuń set ${i + 1}`}
            >
              usuń
            </button>
          </li>
        ))}
      </ol>
      {sets.length < max && (
        <button
          type="button"
          onClick={() => onChange([...sets, { us: 0, them: 0 }])}
          className="mt-2 min-h-10 cursor-pointer text-sm font-bold text-mid underline underline-offset-3"
        >
          + dodaj set
        </button>
      )}
    </div>
  );
}
