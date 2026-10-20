import Image from "next/image";

export interface PlayingCardProps {
  number: string;
  name: string;
  position: string;
  image: string;
  suit: "club" | "spade";
}

export function PlayingCard({
  name,
  number,
  position,
  image,
  suit,
}: PlayingCardProps) {
  const suitPath =
    suit === "club"
      ? "M12 2.5a4.2 4.2 0 0 0-3.4 6.7A4.2 4.2 0 1 0 10.9 16c-.3 2-1.1 3.6-2.4 4.9h7c-1.3-1.3-2.1-2.9-2.4-4.9a4.2 4.2 0 1 0 2.3-6.8A4.2 4.2 0 0 0 12 2.5z"
      : "M12 1.8C9.2 6 3.5 9.2 3.5 13.6a4.3 4.3 0 0 0 7.4 3c-.3 1.9-1.1 3.4-2.4 4.6h7c-1.3-1.2-2.1-2.7-2.4-4.6a4.3 4.3 0 0 0 7.4-3C20.5 9.2 14.8 6 12 1.8z";

  return (
    <div className="relative aspect-5/7 w-65 rounded-2xl bg-white shadow-xl">
      <div className="absolute top-3 left-3 flex items-center gap-1.5 text-navy">
        <p className="font-display text-3xl font-black">{number}</p>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-5"
          aria-hidden="true"
        >
          <path d={suitPath} />
        </svg>
      </div>

      <div className="absolute inset-x-3 top-14 bottom-16 overflow-hidden rounded-xl bg-linear-to-b from-navy to-sky">
        <Image
          src={image}
          alt={name}
          fill
          sizes="240px"
          className="object-contain object-bottom"
        />
      </div>

      <div className="absolute bottom-3 left-4">
        <p className="font-display text-2xl font-extrabold">{name}</p>
        <p className="text-sm text-ink/70">{position}</p>
      </div>

      <div className="absolute bottom-3 right-3 text-navy">
        <p className="font-display text-3xl font-black rotate-180">{number}</p>
      </div>
    </div>
  );
}
