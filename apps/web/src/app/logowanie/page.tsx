import type { Metadata } from "next";
import { TelegramLogin } from "@/components/auth/TelegramLogin";

export const metadata: Metadata = {
  title: "Logowanie",
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-b from-navy via-mid via-58% to-sky px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 -left-[900px] h-[calc(100%+900px)] w-[calc(100%+900px)] animate-drift bg-[url(/images/topo.svg)] bg-size-[900px_900px] opacity-50 motion-reduce:animate-none"
      />
      <TelegramLogin />
    </main>
  );
}
