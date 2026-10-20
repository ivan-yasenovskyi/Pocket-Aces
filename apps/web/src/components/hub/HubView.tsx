"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { players } from "@/data/players";
import { ApiError, api, type Me } from "@/lib/api";
import { AttendancePanel } from "./AttendancePanel";
import { GoingPanel } from "./GoingPanel";
import { HubPlayerCard } from "./HubPlayerCard";
import { HubSidebar } from "./HubSidebar";
import { NextTrainingPanel } from "./NextTrainingPanel";
import { PlayerPicker } from "./PlayerPicker";

type State = { kind: "loading" } | { kind: "error" } | { kind: "ready"; me: Me };

export function HubView() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    api
      .me()
      .then((me) => setState({ kind: "ready", me }))
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) router.replace("/logowanie");
        else setState({ kind: "error" });
      });
  }, [router]);

  async function logout() {
    await api.logout().catch(() => {});
    router.replace("/");
  }

  if (state.kind !== "ready") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ice p-6 text-center">
        {state.kind === "loading" ? (
          <span className="size-8 animate-spin rounded-full border-3 border-sky border-t-transparent motion-reduce:animate-none" aria-label="Ładowanie" />
        ) : (
          <p className="max-w-[40ch] text-base text-muted">
            Nie udało się połączyć z serwerem. Sprawdź, czy API (apps/api) jest uruchomione, i odśwież stronę.
          </p>
        )}
      </main>
    );
  }

  const { me } = state;
  const player = players.find((p) => p.number === me.playerNumber);
  const update = (next: Me) => setState({ kind: "ready", me: next });

  return (
    <div className="flex min-h-screen flex-wrap bg-ice">
      <HubSidebar name={me.user.name} player={player} onLogout={logout} />

      <main className="min-w-0 flex-[999_1_560px] px-10 pt-9 pb-14 max-[560px]:px-4">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <h1 className="font-display text-[72px] leading-[0.9] font-black text-navy uppercase max-[560px]:text-[52px]">
                Witaj ponownie
              </h1>
              <p className="mt-2 text-base text-muted">
                {player ? `#${player.number} ${player.name} · ` : ""}Sezon 2026/27
              </p>
            </div>
            <Link href="/" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-navy hover:text-mid">
              Wróć na stronę
            </Link>
          </div>

          {player ? (
            <>
              <section id="stats" aria-label="Moje statystyki" className="flex flex-wrap items-stretch gap-6">
                <HubPlayerCard player={player} />
                <AttendancePanel attendance={me.attendance} />
              </section>

              <section id="schedule" aria-label="Terminarz" className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6">
                <NextTrainingPanel
                  training={me.nextTraining}
                  onAnswer={async (answer) => {
                    if (me.nextTraining) update(await api.answer(me.nextTraining.id, answer));
                  }}
                />
                <GoingPanel training={me.nextTraining} />
              </section>
            </>
          ) : (
            <PlayerPicker
              takenNumbers={me.takenNumbers}
              onChoose={async (number) => update(await api.choosePlayer(number))}
            />
          )}
        </div>
      </main>
    </div>
  );
}
