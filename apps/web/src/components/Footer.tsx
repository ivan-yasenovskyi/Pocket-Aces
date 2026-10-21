"use client";

import Image from "next/image";
import Link from "next/link";
import { useT } from "@/i18n/locale";

export function Footer() {
  const t = useT();
  const links = [
    { href: "/#team", label: t.nav.team },
    { href: "/#matches", label: t.nav.matches },
    { href: "/mecz", label: t.nav.nextMatch },
    { href: "/#tournament", label: t.nav.tournament },
    { href: "/team", label: t.roster.seeAll },
    { href: "/hub", label: t.footer.hub },
  ];

  return (
    <footer className="bg-ink px-8 py-12 text-[#bfe6f8] max-[560px]:px-4">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image src="/images/logo.webp" alt="" width={485} height={505} className="h-auto w-12" />
          <span className="font-display text-2xl font-black uppercase">Pocket Aces</span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center hover:text-white">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="w-full text-sm">
          © {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
