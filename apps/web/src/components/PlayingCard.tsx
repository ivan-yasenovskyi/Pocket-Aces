interface PlayingCardProps {
  number: string;
  name: string;
  position: string;
  image: string;
  suit: "club" | "spade";
}

export function PlayingCard({ name }: PlayingCardProps) {
  return (
    <div className="relative aspect-[5/7] w-[260px] rounded-2xl bg-white shadow-xl">
      <p className="font-display text-2xl font-extrabold">Cześć, {name}</p>
    </div>
  );
}
