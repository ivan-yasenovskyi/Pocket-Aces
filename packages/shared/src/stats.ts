export type Position = "S" | "OH" | "MB" | "OPP" | "L";

export interface Player {
  id: string;
  number: number;
  name: string;
  position: Position;
}

export interface MatchStat {
  playerId: string;
  attackPoints: number;
  aces: number;
  blocks: number;
  serves: number;
  serveErrors: number;
  digs: number;
}

export function matchPoints(stat: MatchStat): number {
  return stat.attackPoints + stat.aces + stat.blocks;
}

export function serveAccuracy(
  serves: number,
  serveErrors: number,
): number | null {
  if (serves === 0) {
    return null;
  }
  const goodServes = serves - serveErrors;
  return Math.round((goodServes / serves) * 100);
}

export interface SeasonTotals {
  points: number;
  serves: number;
  serveErrors: number;
  matches: number;
}

export function seasonTotals(
  stats: MatchStat[],
  playerId: string,
): SeasonTotals {
  const myMatches = stats.filter((s) => s.playerId === playerId);
  let points = 0;
  let serves = 0;
  let serveErrors = 0;
  for (const s of myMatches) {
    points += matchPoints(s);
    serves += s.serves;
    serveErrors += s.serveErrors;
  }
  return { points, serves, serveErrors, matches: myMatches.length };
}
const stats: MatchStat[] = [
  {
    playerId: "10",
    attackPoints: 7,
    aces: 1,
    blocks: 0,
    serves: 15,
    serveErrors: 2,
    digs: 4,
  },
  {
    playerId: "10",
    attackPoints: 9,
    aces: 2,
    blocks: 1,
    serves: 16,
    serveErrors: 2,
    digs: 3,
  },
  {
    playerId: "10",
    attackPoints: 6,
    aces: 1,
    blocks: 2,
    serves: 14,
    serveErrors: 2,
    digs: 5,
  },
  {
    playerId: "13",
    attackPoints: 4,
    aces: 0,
    blocks: 5,
    serves: 10,
    serveErrors: 3,
    digs: 1,
  },
];

console.log(seasonTotals(stats, "10"));
// console.log("Accuracy", serveAccuracy(45, 6));

// console.log();
export function perMatch(
  total: number,
  matches: number,
  locale: "pl" | "en",
): string {
  const code = locale === "pl" ? "pl-PL" : "en-GB";
  return new Intl.NumberFormat(code, { maximumFractionDigits: 1 }).format(
    total / matches,
  );
}

const t = seasonTotals(stats, "10");
console.log("Points per season ", t.points);
console.log("Matches ", t.matches);
console.log("Points per match (pl):", perMatch(t.points, t.matches, "pl"));
console.log("Points per match (en):", perMatch(t.points, t.matches, "en"));
console.log("Serve Accuracy: ", serveAccuracy(t.serves, t.serveErrors), "%");
console.log("Without serves", serveAccuracy(0, 0));
