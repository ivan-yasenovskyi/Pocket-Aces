import { players, type Player } from "@/data/players";

function byNumber(number: string): Player {
  const player = players.find((p) => p.number === number);
  if (!player) {
    throw new Error(`Нет игрока с номером ${number} в players.ts`);
  }
  return player;
}

export const hand = [byNumber("11"), byNumber("23"), byNumber("15")];
