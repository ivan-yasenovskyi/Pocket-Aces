"use client";

import { useState } from "react";
import { players } from "@/data/players";
import { useT } from "@/i18n/locale";
import { api, type CurrentMatch, type Lineup } from "@/lib/api";
import { POSITIONS, autoLineup } from "@/lib/lineup";
import { Court } from "./Court";

interface LineupEditorProps {
  matchId: string;
  initial: Lineup;
  going: string[];
  onSaved: (next: CurrentMatch) => void;
  onCancel: () => void;
}

const selectClass =
  "mt-1 block min-h-11 w-full rounded-xl border-2 border-white/30 bg-navy px-3 text-[15px] text-white outline-none focus:border-ball";

export function LineupEditor({ matchId, initial, going, onSaved, onCancel }: LineupEditorProps) {
  const tm = useT().match;
  const [lineup, setLineup] = useState<Lineup>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const taken = (except: string | null) =>
    new Set([...Object.values(lineup.positions), lineup.libero].filter((n): n is string => n !== null && n !== except));

  const options = (current: string | null) => {
    const busyNumbers = taken(current);
    return [...players]
      .filter((p) => !busyNumbers.has(p.number))
      .sort((a, b) => Number(going.includes(b.number)) - Number(going.includes(a.number)))
      .map((p) => (
        <option key={p.number} value={p.number}>
          #{p.number} {p.name} {going.includes(p.number) ? "✅" : tm.notGoing}
        </option>
      ));
  };

  async function save() {
    setBusy(true);
    setError(false);
    try {
      onSaved(await api.saveLineup(matchId, lineup));
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Court lineup={lineup} players={players} />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {POSITIONS.map((position) => (
          <label key={position} className="text-sm font-semibold text-[#bfe6f8]">
            {tm.position} {position}
            <select
              value={lineup.positions[position] ?? ""}
              onChange={(e) =>
                setLineup((current) => ({
                  ...current,
                  positions: { ...current.positions, [position]: e.target.value || null },
                }))
              }
              className={selectClass}
            >
              <option value="">{tm.empty}</option>
              {options(lineup.positions[position] ?? null)}
            </select>
          </label>
        ))}
        <label className="text-sm font-semibold text-ball">
          {tm.libero}
          <select
            value={lineup.libero ?? ""}
            onChange={(e) => setLineup((current) => ({ ...current, libero: e.target.value || null }))}
            className={selectClass}
          >
            <option value="">{tm.empty}</option>
            {options(lineup.libero)}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-[#fff4d1] p-3.5 text-[15px] font-semibold text-[#6b4e00]">
          {tm.saveError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="inline-flex min-h-12 cursor-pointer items-center rounded-full bg-ball px-6 text-base font-bold text-ink disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? tm.saving : tm.save}
        </button>
        <button
          type="button"
          onClick={() => setLineup(autoLineup(players, going))}
          className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-white/75 px-6 text-base font-bold text-white hover:bg-white hover:text-ink"
        >
          {tm.auto}
        </button>
        <button type="button" onClick={onCancel} className="inline-flex min-h-12 cursor-pointer items-center px-3 text-base font-bold text-[#bfe6f8] underline underline-offset-3">
          {tm.cancel}
        </button>
      </div>
    </div>
  );
}
