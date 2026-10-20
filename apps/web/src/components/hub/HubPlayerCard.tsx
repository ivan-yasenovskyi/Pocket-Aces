import Image from "next/image";
import { SuitIcon } from "@/components/SuitIcon";
import type { Player } from "@/data/players";

export function HubPlayerCard({ player }: { player: Player }) {
  return (
    <div className="relative h-[272px] flex-[0_0_200px] [transform:rotate(-3deg)] rounded-2xl bg-white shadow-[0_24px_40px_-26px_rgba(2,20,55,0.6)]">
      <div className="absolute top-2 left-3 flex flex-col items-center leading-[0.9] text-navy">
        <span className="font-display text-[30px] font-black">{player.number}</span>
        <SuitIcon suit={player.suit} className="size-4" />
      </div>
      <div className="absolute inset-x-2.5 top-13.5 bottom-13.5 overflow-hidden rounded-[10px] bg-linear-to-b from-navy to-sky">
        <Image
          src={player.image}
          alt={`${player.name}, ${player.number}`}
          width={600}
          height={800}
          sizes="160px"
          loading="eager"
          className="absolute bottom-0 left-1/2 h-[118%] w-auto max-w-none -translate-x-1/2"
        />
      </div>
      <div className="absolute bottom-3 left-3.5">
        <p className="font-display text-[22px] leading-none font-extrabold">{player.name}</p>
        <p className="mt-0.5 text-xs text-muted">{player.position}</p>
      </div>
    </div>
  );
}
