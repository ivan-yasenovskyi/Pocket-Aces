import Link from "next/link";
import type { ReactNode } from "react";

interface ButtonLinkProps {
  href: string;
  variant: "ball" | "line" | "navy";
  size?: "md" | "sm";
  children: ReactNode;
}

const variants = {
  ball: "bg-ball text-ink hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-10px_rgba(255,194,31,0.85)]",
  line: "border-2 border-white/75 text-white hover:bg-white hover:text-ink",
  navy: "bg-navy text-white hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-12px_rgba(2,51,107,0.8)]",
};

const sizes = {
  md: "min-h-13 px-7",
  sm: "min-h-12.5 px-5.5",
};

export function ButtonLink({ href, variant, size = "md", children }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2.5 rounded-full text-base font-bold transition-[translate,box-shadow,background-color,color] duration-200 ease-[ease] motion-reduce:transition-none ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </Link>
  );
}
