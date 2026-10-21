import type { Data } from "./storage.ts";

export interface TournamentInfo {
  name: string;
  date: string | null;
  place: string;
  feePln: number;
  maxTeams: number;
  registrationOpen: boolean;
}

export const TOURNAMENT: TournamentInfo = {
  name: "Pocket Aces Cup",
  date: null,
  place: "Rzgów, Szkolna 5",
  feePln: 400,
  maxTeams: 12,
  registrationOpen: true,
};

export function tournamentInfo(data: Data): TournamentInfo {
  return { ...TOURNAMENT, ...data.tournament };
}
