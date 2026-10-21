import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { PlayerProfile } from "@/components/player/PlayerProfile";
import { players } from "@/data/players";

export function generateStaticParams() {
  return players.map((player) => ({ number: player.number }));
}

export async function generateMetadata({ params }: PageProps<"/team/[number]">): Promise<Metadata> {
  const { number } = await params;
  const player = players.find((p) => p.number === number);
  return player
    ? { title: `#${player.number} ${player.name}`, description: `${player.name} — ${player.position}, Pocket Aces. Statystyki sezonu.` }
    : {};
}

export default async function PlayerPage({ params }: PageProps<"/team/[number]">) {
  const { number } = await params;
  const player = players.find((p) => p.number === number);
  if (!player) notFound();

  return (
    <>
      <PlayerProfile player={player} />
      <Footer />
    </>
  );
}
