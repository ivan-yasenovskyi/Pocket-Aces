"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/i18n/locale";

function subscribe(listener: () => void) {
  const id = window.setInterval(listener, 1000);
  return () => window.clearInterval(id);
}
const nowSeconds = () => Math.floor(Date.now() / 1000);
const serverSnapshot = () => null;

export function Countdown({ date }: { date: string }) {
  const t = useT().cup.countdown;
  const now = useSyncExternalStore(subscribe, nowSeconds, serverSnapshot);
  if (now === null) return null;

  const left = Math.max(0, Math.floor(new Date(`${date}T09:00:00`).getTime() / 1000) - now);
  if (left === 0) return null;
  const parts = [
    { value: Math.floor(left / 86400), label: t.days },
    { value: Math.floor((left % 86400) / 3600), label: t.hours },
    { value: Math.floor((left % 3600) / 60), label: t.minutes },
    { value: left % 60, label: t.seconds },
  ];

  return (
    <div className="mt-6 flex gap-3" role="timer" aria-live="off">
      {parts.map((part) => (
        <div key={part.label} className="min-w-18 rounded-2xl bg-white/12 px-3 py-3 text-center">
          <span className="block font-display text-[40px] leading-none font-black tabular-nums">
            {String(part.value).padStart(2, "0")}
          </span>
          <span className="text-xs text-[#bfe6f8] uppercase">{part.label}</span>
        </div>
      ))}
    </div>
  );
}
