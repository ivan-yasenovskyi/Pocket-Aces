interface PlayingCardProps {
  number: string;
  name: string;
  position: string;
  image: string;
  suit: "club" | "spade";
}

export function PlayingCard({ name, number, position }: PlayingCardProps) {
  return (
    <div className="relative aspect-[5/7] w-[260px] rounded-2xl bg-white shadow-xl">
      <div className="absolute top-3 left-3 text-navy">
        <p className="font-display text-3xl font-black">{number}</p>
      </div>
      <div className="absolute bottom-3 left-4">
        <p className="font-display text-2xl font-extrabold">{name}</p>
        <p className="text-sm text-ink/70">{position}</p>
      </div>
      <div className="absolute bottom-3 right-3">
        <p className="font-display text-3xl font-black rotate-180">{number}</p>
      </div>
    </div>
  );
}
