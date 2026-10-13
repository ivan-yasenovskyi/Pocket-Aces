import { PlayingCard } from "@/components/PlayingCard";

export default function Home() {
  return (
    <main className="p-10">
      <PlayingCard
        number="11"
        name="Yasenovskyi"
        position="Przyjmujący"
        image="/images/player-11.webp"
        suit="club"
      />
    </main>
  );
}
