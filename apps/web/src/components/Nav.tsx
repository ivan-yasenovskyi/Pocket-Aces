import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ButtonLink";

const links = [
  { href: "#team", label: "Drużyna" },
  { href: "#matches", label: "Mecze" },
  { href: "#tournament", label: "Turniej" },
  { href: "/hub", label: "Hub" },
];

export function Nav() {
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

      <div
        role="group"
        aria-label="Język"
        className="relative inline-flex rounded-full border border-white/40 bg-white/12 p-[3px]"
      >
        <span
          aria-hidden="true"
          className="absolute top-[3px] left-[3px] h-11 w-12 translate-x-12 rounded-full bg-white"
        />
        <button
          type="button"
          aria-pressed="false"
          className="relative z-10 h-11 w-12 rounded-full text-sm font-semibold text-white"
        >
          EN
        </button>
        <button
          type="button"
          aria-pressed="true"
          className="relative z-10 h-11 w-12 rounded-full text-sm font-semibold text-ink"
        >
          PL
        </button>
      </div>

      <ButtonLink href="#tournament" variant="ball" size="sm">
        Zgłoś drużynę
      </ButtonLink>
    </nav>
  );
}
