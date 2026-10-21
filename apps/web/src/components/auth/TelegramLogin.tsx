"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, api } from "@/lib/api";

type State =
  | { step: "idle" }
  | { step: "starting" }
  | { step: "waiting"; token: string; link: string }
  | { step: "denied" }
  | { step: "expired" }
  | { step: "error"; reason: "notBound" | "serverDown" };

const buttonClass =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2.5 rounded-full bg-navy px-6 text-[15px] font-bold text-white transition-[translate] duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none";

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
      <path d="M21.9 4.3 18.6 19.9c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6 13.4 1.1 11.9c-1.1-.3-1.1-1.1.2-1.6L20.5 2.9c.9-.3 1.7.2 1.4 1.4z" />
    </svg>
  );
}

export function TelegramLogin() {
  const router = useRouter();
  const t = useT().login;
  const [state, setState] = useState<State>({ step: "idle" });

  useEffect(() => {
    if (state.step !== "waiting") return;
    const id = window.setInterval(async () => {
      try {
        const { status } = await api.loginStatus(state.token);
        if (status === "ok") {
          window.clearInterval(id);
          router.replace("/hub");
        } else if (status === "denied") {
          setState({ step: "denied" });
        } else if (status === "expired") {
          setState({ step: "expired" });
        }
      } catch {
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [state, router]);

  async function start() {
    setState({ step: "starting" });
    try {
      const { token, link } = await api.startLogin();
      window.open(link, "_blank", "noopener");
      setState({ step: "waiting", token, link });
    } catch (error) {
      const reason = error instanceof ApiError && error.code === "bot_not_bound" ? "notBound" : "serverDown";
      setState({ step: "error", reason });
    }
  }

  const botName = state.step === "waiting" ? state.link.split("/").pop()?.split("?")[0] : "";

  return (
    <div className="relative w-full max-w-[460px] rounded-[20px] bg-white p-8 text-ink shadow-[0_1px_0_rgba(2,51,107,0.06),0_30px_60px_-30px_rgba(2,20,55,0.7)] max-[480px]:p-6">
      <Image src="/images/logo.webp" alt="" width={485} height={505} className="h-auto w-16" loading="eager" />
      <h1 className="mt-5 font-display text-[56px] leading-[0.9] font-black text-navy uppercase">{t.title}</h1>
      <p className="mt-3 text-base leading-normal text-muted">
        {t.lead}
      </p>

      {(state.step === "idle" || state.step === "starting" || state.step === "error") && (
        <div className="mt-7">
          <button type="button" onClick={start} disabled={state.step === "starting"} className={buttonClass}>
            <TelegramIcon />
            {t.button}
          </button>
          {state.step === "error" && (
            <p role="alert" className="mt-4 rounded-2xl bg-[#fff4d1] p-3.5 text-[15px] font-semibold text-[#6b4e00]">
              {t[state.reason]}
            </p>
          )}
        </div>
      )}

      {state.step === "waiting" && (
        <div className="mt-7 animate-pop motion-reduce:animate-none" role="status">
          <ol className="flex flex-col gap-3 text-[15px]">
            <li className="flex gap-3">
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-ice font-bold text-navy">1</span>
              <span>
                {t.step1} <b>@{botName}</b>.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-ice font-bold text-navy">2</span>
              <span>
                {t.step2a} <b>Start</b>{t.step2b}
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-ice font-bold text-navy">3</span>
              <span>{t.step3}</span>
            </li>
          </ol>
          <div className="mt-6 flex items-center gap-3 text-[15px] text-muted">
            <span className="size-5 animate-spin rounded-full border-2 border-sky border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
            {t.waiting}
          </div>
          <a href={state.link} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-mid underline underline-offset-3">
            <TelegramIcon />
            {t.reopen}
          </a>
        </div>
      )}

      {(state.step === "denied" || state.step === "expired") && (
        <div className="mt-7">
          <p role="alert" className="animate-pop rounded-2xl bg-[#fff4d1] p-3.5 text-[15px] font-semibold text-[#6b4e00] motion-reduce:animate-none">
            {state.step === "denied" ? t.denied : t.expired}
          </p>
          <button type="button" onClick={start} className={`${buttonClass} mt-5`}>
            <TelegramIcon />
            {t.retry}
          </button>
        </div>
      )}

      <Link href="/" className="mt-8 inline-flex min-h-11 items-center text-[15px] font-semibold text-navy hover:text-mid">
        {t.back}
      </Link>
    </div>
  );
}
