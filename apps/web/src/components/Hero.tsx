"use client";

import { ButtonLink } from "@/components/ButtonLink";
import { HeroPlayer } from "@/components/HeroPlayer";
import { Nav } from "@/components/Nav";
import { useT } from "@/i18n/locale";

export function Hero() {
  const t = useT();

  return (
    <header className="relative overflow-hidden bg-linear-to-b from-navy via-mid via-58% to-sky text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 -left-[900px] h-[calc(100%+900px)] w-[calc(100%+900px)] animate-drift bg-[url(/images/topo.svg)] bg-size-[900px_900px] opacity-50 motion-reduce:animate-none"
      />

      <Nav />

      <div className="relative z-20 mx-auto flex max-w-7xl flex-wrap items-end gap-6 px-8 pt-6">
        <div className="flex-[1_1_520px] pb-24">
          <h1 className="animate-rise font-display text-[196px] leading-[0.84] font-black tracking-[-1px] uppercase motion-reduce:animate-none max-[900px]:text-[120px] max-[560px]:text-[84px]">
            Pocket
            <br />
            Aces
          </h1>
          <p className="mt-7 max-w-[30ch] text-[22px] leading-[1.45] text-[#e3f4fd]">
            {t.hero.tagline}
          </p>
          <div className="mt-9 flex flex-wrap gap-3.5">
            <ButtonLink href="#tournament" variant="ball">
              {t.hero.ctaTournament}
            </ButtonLink>
            <ButtonLink href="#team" variant="line">
              {t.hero.ctaTeam}
            </ButtonLink>
          </div>
        </div>

        <HeroPlayer />
      </div>
    </header>
  );
}
