"use client";

import { useState } from "react";
import { players } from "@/data/players";
import { links, type AdminMatch, type StatLineInput } from "@/lib/api";
import { SetsEditor } from "./SetsEditor";
import { danger, formatDay, input, label, localParts, numberInput, primary } from "./ui";

type Send = (path: string, body: unknown) => Promise<boolean>;

type StatDraft = Record<string, { points: string; aces: string; blocks: string; serve: string }>;

function toDraft(stats: StatLineInput[]): StatDraft {
  return Object.fromEntries(
    stats.map((s) => [
      s.playerNumber,
      { points: String(s.points), aces: String(s.aces), blocks: String(s.blocks), serve: s.serve === null ? "" : String(s.serve) },
    ]),
  );
}

export function MatchEditor({ match, send }: { match: AdminMatch; send: Send }) {
  const league = match.source === "league";
  const [result, setResult] = useState({ us: match.result?.us ?? 0, them: match.result?.them ?? 0, set: match.result !== null });
  const [sets, setSets] = useState(match.sets);
  const [details, setDetails] = useState({ ...localParts(match.startsAt), opponent: match.opponent, place: match.place });
  const [stats, setStats] = useState<StatDraft>(toDraft(match.stats));

  const statValue = (number: string, key: keyof StatDraft[string]) => stats[number]?.[key] ?? "";
  const setStat = (number: string, key: keyof StatDraft[string], value: string) =>
    setStats((current) => ({
      ...current,
      [number]: {
        ...(current[number] ?? { points: "", aces: "", blocks: "", serve: "" }),
        [key]: value.replace(/\D/g, "").slice(0, 3),
      },
    }));

  async function saveScore() {
    const body: Record<string, unknown> = { result: result.set ? { us: result.us, them: result.them } : null, sets };
    if (!league) Object.assign(body, details);
    await send(`matches/${encodeURIComponent(match.id)}`, body);
  }

  async function saveStats() {
    const lines = Object.entries(stats)
      .filter(([, s]) => s.points || s.aces || s.blocks || s.serve)
      .map(([playerNumber, s]) => ({
        playerNumber,
        points: Number(s.points) || 0,
        aces: Number(s.aces) || 0,
        blocks: Number(s.blocks) || 0,
        serve: s.serve === "" ? null : Math.min(100, Number(s.serve)),
      }));
    await send(`matches/${encodeURIComponent(match.id)}/stats`, { lines });
  }

  return (
    <details className="group rounded-2xl border-2 border-[#e3f1fa] bg-white open:border-[#b9d9ee]">
      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
        <span className="w-36 text-sm text-muted">{formatDay(match.startsAt)}</span>
        <span className="min-w-0 flex-1 font-bold">
          {match.home ? `Pocket Aces – ${match.opponent}` : `${match.opponent} – Pocket Aces`}
        </span>
        {league && <span className="rounded-full bg-ice px-2.5 py-0.5 text-xs font-bold text-navy">Liga · {match.round} kolejka</span>}
        <span className="font-display text-2xl font-black text-navy tabular-nums">
          {match.result ? `${match.result.us}:${match.result.them}` : "—"}
        </span>
        <span className="text-sm text-muted">
          {match.stats.length > 0 && `📊 ${match.stats.length}`} {match.photos.length > 0 && `📸 ${match.photos.length}`}
        </span>
      </summary>

      <div className="flex flex-col gap-8 border-t-2 border-[#e3f1fa] px-5 py-6">
        <section className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-6">
          <div>
            <h3 className="font-bold">Wynik (sety, z naszej strony)</h3>
            <label className="mt-2 flex items-center gap-2 text-[15px]">
              <input type="checkbox" checked={result.set} onChange={(e) => setResult({ ...result, set: e.target.checked })} className="size-5 accent-navy" />
              Mecz rozegrany
            </label>
            {result.set && (
              <div className="mt-2 flex items-center gap-2">
                <input type="number" min={0} max={5} aria-label="Sety Pocket Aces" value={result.us} onChange={(e) => setResult({ ...result, us: Number(e.target.value) || 0 })} className={numberInput} />
                <span className="font-bold">:</span>
                <input type="number" min={0} max={5} aria-label="Sety rywala" value={result.them} onChange={(e) => setResult({ ...result, them: Number(e.target.value) || 0 })} className={numberInput} />
              </div>
            )}
            <p className="mt-4 text-sm font-semibold text-muted">Partie</p>
            <SetsEditor sets={sets} max={5} usLabel="Pocket Aces" themLabel={match.opponent} onChange={setSets} />
            {league && <p className="mt-3 text-xs text-muted">Wynik z terminarzu ligi nadpisze te dane, gdy się pojawi.</p>}
          </div>

          {!league && (
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Data
                <input type="date" value={details.date} onChange={(e) => setDetails({ ...details, date: e.target.value })} className={input} />
              </label>
              <label className={label}>
                Godzina
                <input type="time" value={details.time} onChange={(e) => setDetails({ ...details, time: e.target.value })} className={input} />
              </label>
              <label className={`${label} col-span-2`}>
                Rywal
                <input value={details.opponent} onChange={(e) => setDetails({ ...details, opponent: e.target.value })} className={input} />
              </label>
              <label className={`${label} col-span-2`}>
                Miejsce
                <input value={details.place} onChange={(e) => setDetails({ ...details, place: e.target.value })} className={input} />
              </label>
            </div>
          )}
        </section>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={saveScore} className={primary}>
            Zapisz wynik
          </button>
          {!league && (
            <button
              type="button"
              onClick={() => window.confirm("Usunąć ten mecz razem ze statystykami i zdjęciami?") && send(`matches/${encodeURIComponent(match.id)}/delete`, {})}
              className={danger}
            >
              Usuń mecz
            </button>
          )}
        </div>

        <section>
          <h3 className="font-bold">Statystyki zawodników</h3>
          <p className="text-sm text-muted">Puste wiersze nie są zapisywane. Zagrywka — skuteczność w % (opcjonalnie).</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-120 text-left text-[15px]">
              <thead className="text-xs text-muted uppercase">
                <tr>
                  <th scope="col" className="pb-2 font-semibold">Zawodnik</th>
                  <th scope="col" className="pb-2 font-semibold">Punkty</th>
                  <th scope="col" className="pb-2 font-semibold">Asy</th>
                  <th scope="col" className="pb-2 font-semibold">Bloki</th>
                  <th scope="col" className="pb-2 font-semibold">Zagr. %</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.number} className="border-t border-[#e3f1fa]">
                    <td className="py-1.5 font-semibold">
                      <span className="mr-2 font-display text-lg font-black text-navy">#{player.number}</span>
                      {player.name}
                    </td>
                    {(["points", "aces", "blocks", "serve"] as const).map((key) => (
                      <td key={key} className="py-1.5">
                        <input
                          inputMode="numeric"
                          aria-label={`${player.name}: ${key}`}
                          value={statValue(player.number, key)}
                          onChange={(e) => setStat(player.number, key, e.target.value)}
                          className={numberInput}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={saveStats} className={`${primary} mt-4`}>
            Zapisz statystyki
          </button>
        </section>

        {match.photos.length > 0 && (
          <section>
            <h3 className="font-bold">Zdjęcia ({match.photos.length})</h3>
            <ul className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
              {match.photos.map((photo) => (
                <li key={photo.id} className="flex flex-col gap-1">
                  <img src={links.photo(photo.id)} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => window.confirm("Usunąć to zdjęcie ze strony?") && send(`photos/${photo.id}/delete`, {})}
                    className="min-h-9 cursor-pointer text-sm text-[#b91c1c] underline"
                  >
                    usuń
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
}
