import type { Player } from "@/data/players";
import type { Lineup } from "@/lib/api";

export const POSITIONS = ["1", "2", "3", "4", "5", "6"] as const;

const PLAN: { position: (typeof POSITIONS)[number]; role: string }[] = [
  { position: "1", role: "Rozgrywający" },
  { position: "4", role: "Atakujący" },
  { position: "2", role: "Przyjmujący" },
  { position: "5", role: "Przyjmujący" },
  { position: "3", role: "Środkowy" },
  { position: "6", role: "Środkowy" },
];

export function emptyLineup(): Lineup {
  return { positions: Object.fromEntries(POSITIONS.map((p) => [p, null])), libero: null };
}

export function autoLineup(players: Player[], going: string[]): Lineup {
  const pool = [...players].sort(
    (a, b) => Number(going.includes(b.number)) - Number(going.includes(a.number)),
  );
  const used = new Set<string>();
  const take = (match: (p: Player) => boolean) => {
    const player = pool.find((p) => !used.has(p.number) && match(p));
    if (player) used.add(player.number);
    return player?.number ?? null;
  };

  const lineup = emptyLineup();
  lineup.libero = take((p) => p.position === "Libero");
  for (const { position, role } of PLAN) lineup.positions[position] = take((p) => p.position === role);
  for (const position of POSITIONS) {
    lineup.positions[position] ??= take((p) => p.position !== "Libero");
  }
  return lineup;
}
