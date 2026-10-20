import type { ReactNode } from "react";

interface CardBackProps {
  children: ReactNode;
  className?: string;
  rotated?: boolean;
}

export function CardBack({ children, className = "", rotated = true }: CardBackProps) {
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-[18px] bg-navy bg-[url(/images/topo.svg)] bg-size-[450px] shadow-[0_34px_60px_-24px_rgba(2,20,55,0.7)] backface-hidden before:absolute before:inset-2.5 before:rounded-xl before:border-2 before:border-white/55 ${rotated ? "rotate-y-180" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
