import Image from "next/image";
import type { Player } from "@/data/players";
import { SuitIcon } from "@/components/SuitIcon";

const sizes = {
  lg: {
    number: "text-[38px]",
    suit: "size-5.5",
    art: "top-16.5 bottom-18.5",
    caption: "right-14 bottom-4.5 left-4.5",
    name: "text-[28px]",
  },
  md: {
    number: "text-[34px]",
    suit: "size-5",
    art: "top-15 bottom-17.5",
    caption: "right-12.5 bottom-4 left-4",
    name: "text-[26px]",
  },
};

interface CardFrontProps {
  player: Player;
  size: "lg" | "md";
  eager?: boolean;
}

export function CardFront({ player, size, eager = false }: CardFrontProps) {
  const s = sizes[size];

  return (
    <div className="absolute inset-0 rounded-[18px] bg-white shadow-[0_34px_60px_-24px_rgba(2,20,55,0.7)] ring-1 ring-navy/8 ring-inset backface-hidden">
      <div className="absolute top-3 left-3.5 flex flex-col items-center leading-[0.9] text-navy">
        <span className={`font-display font-black ${s.number}`}>{player.number}</span>
        <SuitIcon suit={player.suit} className={s.suit} />
      </div>

      <div
        className={`absolute inset-x-3.5 ${s.art} rounded-xl [background:url(/images/topo.svg)_0_0/450px,linear-gradient(180deg,#02336b_0%,#0a5ba8_60%,#1a9ed5_100%)] [clip-path:inset(-45%_-6%_0_-6%_round_12px)] before:absolute before:inset-0 before:rounded-xl before:bg-linear-to-b before:from-navy before:via-mid before:via-60% before:to-sky before:opacity-55`}
      >
        <Image
          src={player.image}
          alt={`${player.name}, ${player.number}`}
          width={600}
          height={800}
          sizes="260px"
          loading={eager ? "eager" : "lazy"}
          className="absolute bottom-0 left-1/2 h-[122%] w-auto max-w-none -translate-x-1/2"
        />
      </div>

      <div className={`absolute text-ink ${s.caption}`}>
        <p className={`font-display leading-none font-extrabold ${s.name}`}>{player.name}</p>
        <p className="mt-1 text-[13px] text-muted">{player.position}</p>
      </div>

      {size === "lg" && (
        <div className="absolute right-3.5 bottom-3 flex rotate-180 flex-col items-center leading-[0.9] text-navy">
          <span className={`font-display font-black ${s.number}`}>{player.number}</span>
          <SuitIcon suit={player.suit} className={s.suit} />
        </div>
      )}
    </div>
  );
}
