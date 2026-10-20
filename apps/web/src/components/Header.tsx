import Image from "next/image";
import Link from "next/link";

const links = [
  { href: "#team", label: "Drużyna" },
  { href: "#matches", label: "Mecze" },
  { href: "#tournament", label: "Turniej" },
  { href: "#hub", label: "Hub" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-ink text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/images/logo.webp"
            alt=""
            width={40}
            height={42}
            loading="eager"
          />
          <span className="font-display text-2xl font-black uppercase tracking-wide">
            Pocket Aces
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative py-3 text-base font-medium text-white after:absolute after:inset-x-1 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:bg-ball after:transition-transform after:duration-250 hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-white">PL</span>
          <span className="text-white/30">/</span>
          <span className="text-white/50">EN</span>
        </div>
      </div>
    </header>
  );
}
