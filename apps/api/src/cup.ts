import { randomKey } from "./auth.ts";
import type { Cup, CupGame, CupGroup, Data, Registration, Score } from "./storage.ts";

export function gameWinner(sets: Score[]): "home" | "away" | null {
  const home = sets.filter((s) => s.us > s.them).length;
  const away = sets.filter((s) => s.them > s.us).length;
  if (home >= 2) return "home";
  if (away >= 2) return "away";
  return null;
}

export function roundRobin(teams: string[]): [string, string][] {
  const list: (string | null)[] = teams.length % 2 ? [...teams, null] : [...teams];
  const games: [string, string][] = [];
  for (let round = 0; round < list.length - 1; round += 1) {
    for (let i = 0; i < list.length / 2; i += 1) {
      const a = list[i];
      const b = list[list.length - 1 - i];
      if (a && b) games.push(round % 2 ? [b, a] : [a, b]);
    }
    list.splice(1, 0, list.pop()!);
  }
  return games;
}

export function drawGroups(teams: string[], groupCount: number, random = Math.random): Cup {
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const groups: CupGroup[] = Array.from({ length: groupCount }, (_, i) => ({
    name: String.fromCharCode(65 + i),
    teams: [],
  }));
  shuffled.forEach((team, i) => groups[i % groupCount].teams.push(team));

  const games: CupGame[] = groups.flatMap((group) =>
    roundRobin(group.teams).map(([home, away]) => ({
      id: randomKey(6),
      stage: "group" as const,
      group: group.name,
      label: `Grupa ${group.name}`,
      home,
      away,
      startsAt: null,
      court: "",
      sets: [],
    })),
  );
  return { groups, games };
}

export interface GroupRow {
  team: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  setsWon: number;
  setsLost: number;
  smallWon: number;
  smallLost: number;
}

export function groupTable(group: CupGroup, games: CupGame[]): GroupRow[] {
  const rows = new Map<string, GroupRow>(
    group.teams.map((team) => [
      team,
      { team, played: 0, won: 0, lost: 0, points: 0, setsWon: 0, setsLost: 0, smallWon: 0, smallLost: 0 },
    ]),
  );

  for (const game of games) {
    if (game.stage !== "group" || game.group !== group.name) continue;
    const winner = gameWinner(game.sets);
    const home = rows.get(game.home);
    const away = rows.get(game.away);
    if (!winner || !home || !away) continue;

    const homeSets = game.sets.filter((s) => s.us > s.them).length;
    const awaySets = game.sets.filter((s) => s.them > s.us).length;
    const [win, lose] = winner === "home" ? [home, away] : [away, home];
    win.won += 1;
    lose.lost += 1;
    const tieBreak = homeSets + awaySets === 3;
    win.points += tieBreak ? 2 : 3;
    lose.points += tieBreak ? 1 : 0;

    for (const [row, sw, sl, pw, pl] of [
      [home, homeSets, awaySets, sum(game.sets, "us"), sum(game.sets, "them")],
      [away, awaySets, homeSets, sum(game.sets, "them"), sum(game.sets, "us")],
    ] as const) {
      row.played += 1;
      row.setsWon += sw;
      row.setsLost += sl;
      row.smallWon += pw;
      row.smallLost += pl;
    }
  }

  const ratio = (a: number, b: number) => (b === 0 ? (a === 0 ? 0 : Infinity) : a / b);
  return [...rows.values()].sort(
    (a, b) =>
      b.points - a.points ||
      ratio(b.setsWon, b.setsLost) - ratio(a.setsWon, a.setsLost) ||
      ratio(b.smallWon, b.smallLost) - ratio(a.smallWon, a.smallLost),
  );
}

function sum(sets: Score[], side: keyof Score): number {
  return sets.reduce((total, s) => total + s[side], 0);
}

export function cupView(data: Data) {
  const name = (id: string) => data.registrations.find((r) => r.id === id)?.teamName ?? "?";
  const cup = data.cup;
  return {
    groups: cup.groups.map((group) => ({
      name: group.name,
      table: groupTable(group, cup.games).map((row) => ({ ...row, team: name(row.team) })),
    })),
    games: [...cup.games]
      .sort((a, b) => (a.startsAt ?? "9").localeCompare(b.startsAt ?? "9"))
      .map((game) => ({
        id: game.id,
        stage: game.stage,
        group: game.group,
        label: game.label,
        home: name(game.home),
        away: name(game.away),
        startsAt: game.startsAt,
        court: game.court,
        sets: game.sets,
        winner: gameWinner(game.sets),
      })),
  };
}

export function paidTeams(registrations: Registration[]): Registration[] {
  return registrations.filter((r) => r.status === "paid");
}
