"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { players } from "@/data/players";

const INTERVAL_MS = 4000;

export function HeroPlayer() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = players[active];

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (paused || reduceMotion) return;

    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % players.length);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative h-[600px] min-w-[300px] flex-[1_1_480px] max-[900px]:h-[440px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-10 left-1/2 aspect-square w-[520px] -translate-x-1/2 animate-glow rounded-full bg-[radial-gradient(circle,rgba(159,227,255,0.45)_0%,rgba(159,227,255,0)_65%)] motion-reduce:animate-none max-[900px]:w-[380px]"
      />

      <div aria-hidden="true" className="absolute inset-x-0 top-0 animate-number-in motion-reduce:animate-none">
        {players.map((player, i) => (
          <span
            key={player.number}
            className={`absolute inset-x-0 top-0 text-center font-display text-[460px] leading-[0.8] font-black text-transparent transition-[opacity,scale] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] [-webkit-text-stroke:2px_rgba(255,255,255,0.35)] motion-reduce:transition-none max-[900px]:text-[320px] ${i === active ? "scale-100 opacity-100" : "scale-110 opacity-0"}`}
          >
            {player.number}
          </span>
        ))}
      </div>

      <div className="absolute inset-0 animate-player-in motion-reduce:animate-none">
        {players.map((player, i) => (
          <Image
            key={player.number}
            src={player.image}
            alt={i === active ? `${player.name}, ${player.number}` : ""}
            aria-hidden={i !== active}
            width={600}
            height={800}
            sizes="(max-width: 900px) 330px, 450px"
            loading={i === 0 ? "eager" : "lazy"}
            className={`absolute bottom-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2 drop-shadow-[0_30px_40px_rgba(2,20,55,0.45)] transition-[opacity,translate] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${i === active ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
          />
        ))}
      </div>

      <div className="absolute right-0 bottom-16 z-10 text-right [text-shadow:0_2px_12px_rgba(2,20,55,0.5)] max-[900px]:bottom-12">
        <div key={current.number} className="animate-caption-in motion-reduce:animate-none">
          <p className="font-display text-[34px] leading-none font-extrabold">{current.name}</p>
          <p className="mt-1 text-sm text-[#e3f4fd]">
            #{current.number} · {current.position}
          </p>
        </div>
      </div>

      <div className="absolute right-0 bottom-6 z-10 flex gap-2">
        {players.map((player, i) => (
          <button
            key={player.number}
            type="button"
            aria-label={`Pokaż zawodnika ${player.number}`}
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={`h-2.5 cursor-pointer rounded-full transition-[width,background-color] duration-300 ${i === active ? "w-6 bg-ball" : "w-2.5 bg-white/45 hover:bg-white/80"}`}
          />
        ))}
      </div>
    </div>
  );
}
