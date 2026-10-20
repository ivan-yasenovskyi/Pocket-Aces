"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CardBack } from "@/components/CardBack";
import { CardFront } from "@/components/CardFront";
import { hand } from "@/data/featured";
import { sampleStats } from "@/data/stats";

const slotTransforms = [
  "min-[900px]:[transform:translateX(-300px)_translateY(34px)_rotate(-12deg)] min-[900px]:group-hover:[transform:translateX(-390px)_translateY(30px)_rotate(-14deg)]",
  "min-[900px]:[transform:translateX(-100px)_translateY(6px)_rotate(-4deg)] min-[900px]:group-hover:[transform:translateX(-132px)_translateY(0)_rotate(-5deg)]",
  "min-[900px]:[transform:translateX(100px)_translateY(6px)_rotate(4deg)] min-[900px]:group-hover:[transform:translateX(132px)_translateY(0)_rotate(5deg)]",
  "min-[900px]:[transform:translateX(300px)_translateY(34px)_rotate(12deg)] min-[900px]:group-hover:[transform:translateX(390px)_translateY(30px)_rotate(14deg)]",
];

const slotBase = "relative h-[336px] flex-[0_0_240px] snap-center min-[900px]:absolute min-[900px]:top-10 min-[900px]:left-1/2 min-[900px]:-ml-[130px] min-[900px]:h-[364px] min-[900px]:w-65 min-[900px]:flex-none min-[900px]:transition-transform min-[900px]:duration-500 min-[900px]:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none";

const cardBase = "block size-full cursor-pointer text-left perspective-[1400px] transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-[22px] motion-reduce:transition-none";

export function RosterFan() {
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
          Nasze karty
        </h2>
        <p className="max-w-[36ch] text-lg leading-normal text-[#24456e]">
          Dotknij karty, aby ją odwrócić i zobaczyć sezon zawodnika.
        </p>
      </div>

      <div className="group relative -mx-8 mt-10 flex max-w-[1100px] snap-x snap-mandatory gap-4 overflow-x-auto px-8 pt-6 pb-10 min-[900px]:mx-auto min-[900px]:block min-[900px]:h-[470px] min-[900px]:overflow-visible min-[900px]:p-0">
        {hand.map((player, i) => {
          const isFlipped = flipped.includes(player.number);
          const stats = sampleStats[player.number];

          return (
            <div key={player.number} className={`${slotBase} ${slotTransforms[i]}`}>
              <button
                type="button"
                aria-pressed={isFlipped}
                aria-label={`Odwróć kartę zawodnika ${player.number}`}
                onClick={() => toggle(player.number)}
                className={cardBase}
              >
                <div
                  className={`relative size-full transform-3d transition-transform duration-700 ease-[cubic-bezier(0.3,0.7,0.2,1)] motion-reduce:transition-none ${isFlipped ? "rotate-y-180" : ""}`}
                >
                  <CardFront player={player} size="md" />
                  <CardBack className="flex flex-col px-6 py-6.5 text-white">
                    <div className="relative flex items-baseline gap-2.5">
                      <span className="font-display text-[30px] font-black text-ball">{player.number}</span>
                      <span className="font-display text-[26px] font-extrabold">{player.name}</span>
                    </div>
                    <p className="relative mt-0.5 text-[13px] text-[#bfe6f8]">Sezon 2026/27</p>

                    {stats && (
                      <>
                        <div className="relative mt-5.5 grid grid-cols-2 gap-x-3 gap-y-4.5">
                          {[
                            { value: stats.points, label: "Punkty" },
                            { value: stats.aces, label: "Asy" },
                            { value: stats.blocks, label: "Bloki" },
                            { value: stats.matches, label: "Mecze" },
                          ].map((item) => (
                            <div key={item.label}>
                              <p className="font-display text-[44px] leading-none font-black">{item.value}</p>
                              <p className="text-[13px] text-[#bfe6f8]">{item.label}</p>
                            </div>
                          ))}
                        </div>

                        <div className="relative mt-auto">
                          <div className="flex justify-between text-[13px] text-[#bfe6f8]">
                            <span>Skuteczność zagrywki</span>
                            <span>{stats.serve}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/18">
                            <div className="h-full rounded-full bg-ball" style={{ width: `${stats.serve}%` }} />
                          </div>
                        </div>
                      </>
                    )}
                  </CardBack>
                </div>
              </button>
            </div>
          );
        })}

        <div className={`${slotBase} ${slotTransforms[3]}`}>
          <Link href="/team" prefetch={false} className={cardBase}>
            <div className="relative size-full">
              <CardBack rotated={false} className="flex flex-col items-center justify-center gap-4.5 text-white">
                <Image
                  src="/images/logo.webp"
                  alt=""
                  width={485}
                  height={505}
                  className="relative h-auto w-[56%]"
                />
                <span className="relative text-base font-semibold">Zobacz całą drużynę</span>
              </CardBack>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
