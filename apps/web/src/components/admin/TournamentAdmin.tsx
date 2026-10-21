"use client";

import { useState } from "react";
import type { AdminOverview, CupGameView, RegistrationStatus, Score, TournamentSettings } from "@/lib/api";
import { SetsEditor } from "./SetsEditor";
import { card, danger, input, label, localParts, primary, secondary } from "./ui";

type Send = (path: string, body: unknown) => Promise<boolean>;

const STATUS_LABELS: Record<RegistrationStatus, string> = {
  pending: "Czeka na płatność",
  paid: "Opłacona ✓",
  rejected: "Odrzucona",
};

const LEVELS: Record<string, string> = { "1st": "I liga", "2nd": "II liga", "3rd": "III liga", independent: "niezrzeszona" };

function SettingsForm({ settings, send }: { settings: TournamentSettings; send: Send }) {
  const [form, setForm] = useState(settings);
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Ustawienia turnieju</h2>
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <label className={label}>
          Nazwa
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
        </label>
        <label className={label}>
          Data (pusta = „Termin wkrótce”)
          <input type="date" value={form.date ?? ""} onChange={(e) => setForm({ ...form, date: e.target.value || null })} className={input} />
        </label>
        <label className={label}>
          Miejsce
          <input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} className={input} />
        </label>
        <label className={label}>
          Wpisowe (PLN)
          <input type="number" min={0} value={form.feePln} onChange={(e) => setForm({ ...form, feePln: Number(e.target.value) || 0 })} className={input} />
        </label>
        <label className={label}>
          Liczba miejsc
          <input type="number" min={2} max={64} value={form.maxTeams} onChange={(e) => setForm({ ...form, maxTeams: Number(e.target.value) || 2 })} className={input} />
        </label>
        <label className="flex items-center gap-3 self-end pb-2 text-[15px] font-semibold">
          <input type="checkbox" checked={form.registrationOpen} onChange={(e) => setForm({ ...form, registrationOpen: e.target.checked })} className="size-5 accent-navy" />
          Zapisy otwarte
        </label>
      </div>
      <button type="button" onClick={() => send("tournament", form)} className={`${primary} mt-5`}>
        Zapisz ustawienia
      </button>
    </section>
  );
}

function Registrations({ overview, send }: { overview: AdminOverview; send: Send }) {
  const list = overview.registrations;
  return (
    <section className={card}>
      <h2 className="text-lg font-bold">
        Zgłoszenia ({list.filter((r) => r.status !== "rejected").length}/{overview.tournament.maxTeams})
      </h2>
      <p className="text-sm text-muted">Na stronie widać tylko drużyny z potwierdzoną płatnością. Odrzucone zwalniają miejsce.</p>
      {list.length === 0 ? (
        <p className="mt-3 text-[15px] text-muted">Jeszcze nikt się nie zgłosił.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-180 text-left text-[15px]">
            <thead className="text-xs text-muted uppercase">
              <tr>
                <th scope="col" className="pb-2 font-semibold">Drużyna</th>
                <th scope="col" className="pb-2 font-semibold">Kapitan</th>
                <th scope="col" className="pb-2 font-semibold">Kontakt</th>
                <th scope="col" className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={`border-t border-[#e3f1fa] align-top ${r.status === "rejected" ? "opacity-50" : ""}`}>
                  <td className="py-2.5">
                    <span className="block font-bold">{r.teamName}</span>
                    <span className="text-sm text-muted">
                      {[r.city, LEVELS[r.level]].filter(Boolean).join(" · ")}
                      {r.instagram && ` · @${r.instagram}`}
                    </span>
                  </td>
                  <td className="py-2.5">{r.captainName}</td>
                  <td className="py-2.5 text-sm">
                    <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="block text-mid underline">{r.phone}</a>
                    <a href={`mailto:${r.email}`} className="block text-mid underline">{r.email}</a>
                  </td>
                  <td className="py-2.5">
                    <select
                      value={r.status}
                      aria-label={`Status: ${r.teamName}`}
                      onChange={(e) => send(`registrations/${r.id}`, { status: e.target.value })}
                      className={`${input} mt-0 min-w-44`}
                    >
                      {(Object.keys(STATUS_LABELS) as RegistrationStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GameEditor({ game, send }: { game: CupGameView; send: Send }) {
  const start = game.startsAt ? localParts(game.startsAt) : { date: "", time: "" };
  const [sets, setSets] = useState<Score[]>(game.sets);
  const [when, setWhen] = useState(start);
  const [court, setCourt] = useState(game.court);

  return (
    <li className="flex flex-col gap-3 border-t border-[#e3f1fa] py-4">
      <p className="font-bold">
        <span className="mr-2 rounded-full bg-ice px-2.5 py-0.5 text-xs text-navy">{game.label}</span>
        {game.home} – {game.away}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className={label}>
          Dzień
          <input type="date" value={when.date} onChange={(e) => setWhen({ ...when, date: e.target.value })} className={input} />
        </label>
        <label className={label}>
          Godzina
          <input type="time" value={when.time} onChange={(e) => setWhen({ ...when, time: e.target.value })} className={input} />
        </label>
        <label className={label}>
          Boisko
          <input value={court} onChange={(e) => setCourt(e.target.value)} className={`${input} w-24`} />
        </label>
      </div>
      <SetsEditor sets={sets} max={3} usLabel={game.home} themLabel={game.away} onChange={setSets} />
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => send(`cup/games/${game.id}`, { sets, court, date: when.date, time: when.time || "09:00" })}
          className={primary}
        >
          Zapisz grę
        </button>
        {game.stage === "playoff" && (
          <button type="button" onClick={() => window.confirm("Usunąć tę grę?") && send(`cup/games/${game.id}/delete`, {})} className={danger}>
            Usuń
          </button>
        )}
      </div>
    </li>
  );
}

function CupAdmin({ overview, send }: { overview: AdminOverview; send: Send }) {
  const paid = overview.registrations.filter((r) => r.status === "paid");
  const [groupCount, setGroupCount] = useState(Math.max(1, Math.floor(paid.length / 4)));
  const [playoff, setPlayoff] = useState({ label: "Półfinał 1", home: "", away: "" });
  const cup = overview.cup;

  return (
    <section className={card}>
      <h2 className="text-lg font-bold">Rozgrywki turnieju</h2>
      <p className="text-sm text-muted">
        Grupy losujemy z drużyn z potwierdzoną płatnością ({paid.length}). Mecze do dwóch wygranych setów: 2:0 — 3 pkt, 2:1 — 2 pkt
        i 1 pkt dla przegranego.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className={label}>
          Liczba grup
          <select value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} className={`${input} w-28`}>
            {[1, 2, 3, 4, 6].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={paid.length < groupCount * 2}
          onClick={() =>
            (cup.groups.length === 0 || window.confirm("Nowe losowanie usunie obecne grupy i wyniki. Kontynuować?")) &&
            send("cup/draw", { groupCount })
          }
          className={secondary}
        >
          {cup.groups.length ? "Losuj grupy od nowa" : "Losuj grupy"}
        </button>
      </div>

      {cup.groups.length > 0 && (
        <p className="mt-4 text-[15px]">
          {cup.groups.map((g) => (
            <span key={g.name} className="mr-4 inline-block">
              <b>Grupa {g.name}:</b> {g.table.map((r) => r.team).join(", ")}
            </span>
          ))}
        </p>
      )}

      <ul className="mt-4">
        {cup.games.map((game) => (
          <GameEditor key={game.id} game={game} send={send} />
        ))}
      </ul>

      {paid.length >= 2 && (
        <div className="mt-6 border-t-2 border-[#e3f1fa] pt-5">
          <h3 className="font-bold">Dodaj mecz play-off</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className={label}>
              Etap
              <input value={playoff.label} onChange={(e) => setPlayoff({ ...playoff, label: e.target.value })} className={`${input} w-44`} />
            </label>
            {(["home", "away"] as const).map((side) => (
              <label key={side} className={label}>
                {side === "home" ? "Drużyna 1" : "Drużyna 2"}
                <select value={playoff[side]} onChange={(e) => setPlayoff({ ...playoff, [side]: e.target.value })} className={`${input} min-w-48`}>
                  <option value="">— wybierz —</option>
                  {paid.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.teamName}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button
              type="button"
              disabled={!playoff.label || !playoff.home || !playoff.away || playoff.home === playoff.away}
              onClick={() => send("cup/games", playoff)}
              className={primary}
            >
              Dodaj
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function TournamentAdmin({ overview, send }: { overview: AdminOverview; send: Send }) {
  return (
    <div className="flex flex-col gap-6">
      <SettingsForm settings={overview.tournament} send={send} />
      <Registrations overview={overview} send={send} />
      <CupAdmin overview={overview} send={send} />
    </div>
  );
}
