export type Position = "S" | "OH" | "MB" | "OPP" | "L";

interface Player {
  id: string;
  number: number;
  name: string;
  position: Position;
}

interface MatchStat {
  playerId: string;
  attackPoints: number;
  aces: number;
  blocks: number;
  serves: number;
  serveErrors: number;
  digs: number;
}
