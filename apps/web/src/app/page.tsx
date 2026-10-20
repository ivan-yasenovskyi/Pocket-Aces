import { PlayingCard } from "@/components/PlayingCard";
import { players } from "@/data/players";

export default function Home() {
  return (
    <main className="flex flex-wrap gap-6 p-10">
      {players.map((player) => (
        <PlayingCard
          key={player.number}
          number={player.number}
          name={player.name}
          position={player.position}
          image={player.image}
          suit={player.suit}
        />
      ))}
    </main>
  );
}
