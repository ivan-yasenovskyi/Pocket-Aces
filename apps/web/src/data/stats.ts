export interface SeasonStats {
  points: number;
  aces: number;
  blocks: number;
  matches: number;
  serve: number;
}

export const sampleStats: Record<string, SeasonStats> = {
  "11": { points: 186, aces: 21, blocks: 14, matches: 18, serve: 87 },
  "23": { points: 142, aces: 9, blocks: 38, matches: 17, serve: 81 },
  "15": { points: 64, aces: 17, blocks: 11, matches: 18, serve: 92 },
};
