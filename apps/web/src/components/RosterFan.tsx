"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CardBack } from "@/components/CardBack";
import { PlayerFlipCard, cardBase } from "@/components/PlayerFlipCard";
import { hand } from "@/data/featured";
import { useT } from "@/i18n/locale";
import { api } from "@/lib/api";
import { useApi } from "@/lib/useApi";

const slotTransforms = [
  "min-[900px]:[transform:translateX(-300px)_translateY(34px)_rotate(-12deg)] min-[900px]:group-hover:[transform:translateX(-390px)_translateY(30px)_rotate(-14deg)]",
  "min-[900px]:[transform:translateX(-100px)_translateY(6px)_rotate(-4deg)] min-[900px]:group-hover:[transform:translateX(-132px)_translateY(0)_rotate(-5deg)]",
  "min-[900px]:[transform:translateX(100px)_translateY(6px)_rotate(4deg)] min-[900px]:group-hover:[transform:translateX(132px)_translateY(0)_rotate(5deg)]",
  "min-[900px]:[transform:translateX(300px)_translateY(34px)_rotate(12deg)] min-[900px]:group-hover:[transform:translateX(390px)_translateY(30px)_rotate(14deg)]",
];

const slotBase = "relative h-[336px] flex-[0_0_240px] snap-center min-[900px]:absolute min-[900px]:top-10 min-[900px]:left-1/2 min-[900px]:-ml-[130px] min-[900px]:h-[364px] min-[900px]:w-65 min-[900px]:flex-none min-[900px]:transition-transform min-[900px]:duration-500 min-[900px]:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none";

export function RosterFan() {
  const t = useT();
  const { data } = useApi(api.stats);
  const [flipped, setFlipped] = useState<string[]>([]);

  function toggle(number: string) {
    setFlipped((current) =>
      current.includes(number)
        ? current.filter((n) => n !== number)
        : [...current, number],
    );
  }

  return (
    <section id="team" className="relative bg-ice px-8 pt-26 pb-24">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-x-10 gap-y-4">
        <h2 className="font-display text-[96px] leading-[0.9] font-black text-navy uppercase max-[560px]:text-[64px]">
          {t.roster.title}
        </h2>
        <p className="max-w-[36ch] text-lg leading-normal text-[#24456e]">{t.roster.hint}</p>
      </div>

      <div className="group relative -mx-8 mt-10 flex max-w-[1100px] snap-x snap-mandatory gap-4 overflow-x-auto px-8 pt-6 pb-10 min-[900px]:mx-auto min-[900px]:block min-[900px]:h-[470px] min-[900px]:overflow-visible min-[900px]:p-0">
        {hand.map((player, i) => (
          <div key={player.number} className={`${slotBase} ${slotTransforms[i]}`}>
            <PlayerFlipCard
              player={player}
              stats={data?.stats[player.number]}
              flipped={flipped.includes(player.number)}
              onFlip={() => toggle(player.number)}
            />
          </div>
        ))}

        <div className={`${slotBase} ${slotTransforms[3]}`}>
          <Link href="/team" className={cardBase}>
            <div className="relative size-full">
              <CardBack rotated={false} className="flex flex-col items-center justify-center gap-4.5 text-white">
                <Image
                  src="/images/logo.webp"
                  alt=""
                  width={485}
                  height={505}
                  className="relative h-auto w-[56%]"
                />
                <span className="relative text-base font-semibold">{t.roster.seeAll}</span>
              </CardBack>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
