"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, type AdminOverview } from "@/lib/api";
import { MatchEditor } from "./MatchEditor";
import { TournamentAdmin } from "./TournamentAdmin";
import { card, input, label, primary } from "./ui";

type State = { kind: "loading" } | { kind: "forbidden" } | { kind: "error" } | { kind: "ready"; overview: AdminOverview };
type Tab = "matches" | "tournament";

export function AdminPanel() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>("matches");
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [newMatch, setNewMatch] = useState({ date: "", time: "", opponent: "", place: "" });

  useEffect(() => {
    api.admin
      .overview()
      .then((overview) => setState({ kind: "ready", overview }))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) router.replace("/logowanie");
        else if (error instanceof ApiError && error.status === 403) setState({ kind: "forbidden" });
        else setState({ kind: "error" });
      });
  }, [router]);

  async function send(path: string, body: unknown): Promise<boolean> {
    try {
      const overview = await api.admin.post(path, body);
      setState({ kind: "ready", overview });
      setToast({ ok: true, text: "Zapisano ✓" });
      return true;
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      const text =
        code === "league_match"
          ? "Meczu ligowego nie da się usunąć — wróci z terminarzu."
          : code === "invalid"
            ? "Sprawdź pola — coś jest niepoprawne."
            : "Nie udało się zapisać. Spróbuj ponownie.";
      setToast({ ok: false, text });
      return false;
    } finally {
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  async function addMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await send("matches", newMatch)) setNewMatch({ date: "", time: "", opponent: "", place: "" });
  }

  if (state.kind !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice p-6 text-center">
        {state.kind === "loading" ? (
          <span className="size-8 animate-spin rounded-full border-3 border-sky border-t-transparent motion-reduce:animate-none" aria-label="Ładowanie" />
        ) : (
          <div className="max-w-[44ch]">
            <p className="text-base text-muted">
              {state.kind === "forbidden"
                ? "Panel kapitana jest dostępny tylko dla administratorów grupy drużyny w Telegramie."
                : "Nie udało się połączyć z serwerem. Sprawdź, czy API jest uruchomione."}
            </p>
            <Link href="/hub" className="mt-4 inline-flex min-h-11 items-center font-bold text-navy underline">
              ← Wróć do kabinetu
            </Link>
          </div>
        )}
      </main>
    );
  }

  const { overview } = state;
  const tabClass = (value: Tab) =>
    `min-h-11 cursor-pointer rounded-full px-5 text-[15px] font-bold ${tab === value ? "bg-navy text-white" : "bg-white text-navy hover:bg-[#d3ecf9]"}`;

  return (
    <div className="min-h-screen bg-ice">
      <header className="relative overflow-hidden bg-navy text-white">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[700px] opacity-22" />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-8 py-5 max-[560px]:px-4">
          <Link href="/" className="mr-auto flex items-center gap-3">
            <Image src="/images/logo.webp" alt="" width={485} height={505} className="h-auto w-11" loading="eager" />
            <span className="font-display text-2xl font-black uppercase">Panel kapitana</span>
          </Link>
          <Link href="/hub" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#bfe6f8] hover:text-white">
            Kabinet
          </Link>
          <Link href="/mecz" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#bfe6f8] hover:text-white">
            Skład na mecz
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8 max-[560px]:px-4">
        <div role="tablist" aria-label="Sekcje" className="flex flex-wrap gap-2">
          <button type="button" role="tab" aria-selected={tab === "matches"} onClick={() => setTab("matches")} className={tabClass("matches")}>
            Mecze ({overview.matches.length})
          </button>
          <button type="button" role="tab" aria-selected={tab === "tournament"} onClick={() => setTab("tournament")} className={tabClass("tournament")}>
            Turniej ({overview.registrations.filter((r) => r.status === "pending").length} nowych)
          </button>
        </div>

        {tab === "matches" ? (
          <>
            <form onSubmit={addMatch} className={card}>
              <h2 className="text-lg font-bold">Dodaj mecz spoza ligi</h2>
              <p className="text-sm text-muted">Mecze II A ligi bot dodaje sam z siatka-lodzkie.org. Tu — sparingi, puchary itp.</p>
              <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-4">
                <label className={label}>
                  Data
                  <input type="date" required value={newMatch.date} onChange={(e) => setNewMatch({ ...newMatch, date: e.target.value })} className={input} />
                </label>
                <label className={label}>
                  Godzina
                  <input type="time" required value={newMatch.time} onChange={(e) => setNewMatch({ ...newMatch, time: e.target.value })} className={input} />
                </label>
                <label className={label}>
                  Rywal
                  <input required value={newMatch.opponent} onChange={(e) => setNewMatch({ ...newMatch, opponent: e.target.value })} className={input} />
                </label>
                <label className={label}>
                  Miejsce
                  <input value={newMatch.place} onChange={(e) => setNewMatch({ ...newMatch, place: e.target.value })} className={input} />
                </label>
              </div>
              <button type="submit" className={`${primary} mt-5`}>
                Dodaj mecz
              </button>
            </form>

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-bold">Wszystkie mecze</h2>
              <p className="text-sm text-muted">Kliknij mecz, żeby wpisać wynik, partie i statystyki zawodników. Zdjęcia dodajesz w bocie: zdjęcie z podpisem /foto.</p>
              {[...overview.matches].reverse().map((match) => (
                <MatchEditor key={match.id} match={match} send={send} />
              ))}
            </section>
          </>
        ) : (
          <TournamentAdmin overview={overview} send={send} />
        )}
      </main>

      {toast && (
        <p
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-pop rounded-full px-5 py-3 text-[15px] font-bold shadow-lg motion-reduce:animate-none ${toast.ok ? "bg-[#1f7a4d] text-white" : "bg-[#b91c1c] text-white"}`}
        >
          {toast.text}
        </p>
      )}
    </div>
  );
}
