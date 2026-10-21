"use client";

import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ButtonLink";
import { setLocale, useLocale, useT } from "@/i18n/locale";

export function Nav() {
  const t = useT();
  const locale = useLocale();
  const links = [
    { href: "/#team", label: t.nav.team },
    { href: "/#matches", label: t.nav.matches },
    { href: "/#tournament", label: t.nav.tournament },
    { href: "/hub", label: t.nav.hub },
  ];

  return (
    <nav
      aria-label="Main"
      className="relative z-30 mx-auto flex max-w-7xl flex-wrap items-center gap-7 px-8 py-4.5"
    >
      <Link href="/" className="mr-auto flex items-center gap-3">
        <Image
          src="/images/logo.webp"
          alt=""
          width={56}
          height={58}
          loading="eager"
        />
        <span className="font-display text-[26px] font-black tracking-[0.5px] uppercase">
          Pocket Aces
        </span>
      </Link>

      <div className="flex gap-5.5 max-[900px]:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="relative px-1 py-3 text-base font-medium text-white after:absolute after:inset-x-1 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ball after:transition-transform after:duration-250 hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <Link
        href="/mecz"
        className="inline-flex min-h-11 items-center gap-2.5 rounded-full border-2 border-ball/80 bg-ink/25 px-4.5 text-[15px] font-bold text-white transition-colors duration-200 hover:bg-ball hover:text-ink"
      >
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-ball opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2.5 rounded-full bg-ball" />
        </span>
        {t.nav.nextMatch}
      </Link>

      <div
        role="group"
        aria-label={t.nav.language}
        className="relative inline-flex rounded-full border border-white/40 bg-white/12 p-[3px]"
      >
        <span
          aria-hidden="true"
          className={`absolute top-[3px] left-[3px] h-11 w-12 rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none ${locale === "pl" ? "translate-x-12" : "translate-x-0"}`}
        />
        <button
          type="button"
          aria-pressed={locale === "en"}
          onClick={() => setLocale("en")}
          className={`relative z-10 h-11 w-12 cursor-pointer rounded-full text-sm font-semibold transition-colors duration-300 ${locale === "en" ? "text-ink" : "text-white"}`}
        >
          EN
        </button>
        <button
          type="button"
          aria-pressed={locale === "pl"}
          onClick={() => setLocale("pl")}
          className={`relative z-10 h-11 w-12 cursor-pointer rounded-full text-sm font-semibold transition-colors duration-300 ${locale === "pl" ? "text-ink" : "text-white"}`}
        >
          PL
        </button>
      </div>

      <ButtonLink href="/#tournament" variant="ball" size="sm">
        {t.nav.cta}
      </ButtonLink>
    </nav>
  );
}
