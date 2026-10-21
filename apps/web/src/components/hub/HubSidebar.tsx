import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { Player } from "@/data/players";

const icon = "size-5 flex-none";

const links: { href: string; label: string; current?: boolean; icon: ReactNode }[] = [
  {
    href: "/hub",
    label: "Przegląd",
    current: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={icon} aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "#stats",
    label: "Moje statystyki",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={icon} aria-hidden="true">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    ),
  },
  {
    href: "#schedule",
    label: "Terminarz",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={icon} aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    href: "/#team",
    label: "Drużyna",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={icon} aria-hidden="true">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a5.5 5.5 0 0 1 4 6" />
      </svg>
    ),
  },
];

interface HubSidebarProps {
  name: string;
  player: Player | undefined;
  isCaptain: boolean;
  onLogout: () => void;
}

const captainLink: (typeof links)[number] = {
  href: "/admin",
  label: "Panel kapitana",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={icon} aria-hidden="true">
      <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z" />
    </svg>
  ),
};

export function HubSidebar({ name, player, isCaptain, onLogout }: HubSidebarProps) {
  return (
    <aside className="relative flex max-w-full flex-[1_1_260px] flex-col gap-5.5 overflow-hidden bg-navy px-4.5 py-6 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[700px] opacity-22"
      />

      <Link href="/" className="relative flex items-center gap-2.5 text-white">
        <Image src="/images/logo.webp" alt="" width={485} height={505} className="h-auto w-12" loading="eager" />
        <span className="font-display text-2xl font-black uppercase">Pocket Aces</span>
      </Link>

      <nav aria-label="Hub" className="relative flex flex-col gap-1">
        {(isCaptain ? [...links, captainLink] : links).map((link) => (
          <Link
            key={link.label}
            href={link.href}
            aria-current={link.current ? "page" : undefined}
            className={
              link.current
                ? "flex min-h-[46px] items-center gap-3 rounded-xl bg-white px-3.5 text-[15px] font-bold text-navy"
                : "flex min-h-[46px] items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium text-[#cfeaf8] transition-colors duration-200 hover:bg-white/8 hover:text-white"
            }
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="relative mt-auto flex items-center gap-3 border-t border-white/18 pt-4">
        <div className="relative size-11 flex-none overflow-hidden rounded-full bg-sky">
          {player && (
            <Image src={player.image} alt="" fill sizes="44px" className="object-cover object-[50%_8%]" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold">{player ? player.name : name}</p>
          <button type="button" onClick={onLogout} className="cursor-pointer text-[13px] text-[#bfe6f8] underline underline-offset-2 hover:text-white">
            Wyloguj się
          </button>
        </div>
      </div>
    </aside>
  );
}
