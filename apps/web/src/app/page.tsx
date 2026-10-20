import { ButtonLink } from "@/components/ButtonLink";
import { PlayingCard } from "@/components/PlayingCard";
import { players } from "@/data/players";

export default function Home() {
  return (
    <main className="flex flex-wrap gap-6 p-10">
      <div className="flex w-full gap-4 bg-navy p-8">
        <ButtonLink href="#" variant="ball">Zgłoś się do turnieju</ButtonLink>
        <ButtonLink href="#" variant="line">Poznaj drużynę</ButtonLink>
        <ButtonLink href="#" variant="ball" size="sm">Zgłoś drużynę</ButtonLink>
      </div>
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
