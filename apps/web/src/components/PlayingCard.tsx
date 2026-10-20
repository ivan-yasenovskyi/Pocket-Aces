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
    <div className="relative aspect-5/7 w-65 rounded-[18px] bg-white shadow-[0_34px_60px_-24px_rgba(2,20,55,0.7)] ring-1 ring-navy/8 ring-inset">
      <div className="absolute top-3 left-3.5 flex flex-col items-center leading-[0.9] text-navy">
        <p className="font-display text-[38px] font-black">{number}</p>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-5.5"
          aria-hidden="true"
        >
          <path d={suitPath} />
        </svg>
      </div>

      <div className="absolute inset-x-3.5 top-16.5 bottom-18.5 overflow-hidden rounded-xl bg-linear-to-b from-navy via-mid via-60% to-sky">
        <Image
          src={image}
          alt={name}
          fill
          sizes="240px"
          className="object-contain object-bottom"
        />
      </div>

      <div className="absolute right-14 bottom-4.5 left-4.5 text-ink">
        <p className="font-display text-[28px] leading-none font-extrabold">
          {name}
        </p>
        <p className="mt-1 text-[13px] text-muted">{position}</p>
      </div>

      <div className="absolute right-3.5 bottom-3 flex rotate-180 flex-col items-center leading-[0.9] text-navy">
        <p className="font-display text-[38px] font-black">{number}</p>
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-5.5"
          aria-hidden="true"
        >
          <path d={suitPath} />
        </svg>
      </div>
    </div>
  );
}
