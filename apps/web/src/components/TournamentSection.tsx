"use client";

import { useState, type FormEvent } from "react";
import { useT } from "@/i18n/locale";
import { ApiError, api, type RegistrationForm, type TeamLevel } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { Countdown } from "./tournament/Countdown";
import { CupView } from "./tournament/CupView";

const emptyForm: RegistrationForm = {
  teamName: "",
  city: "",
  level: "independent",
  captainName: "",
  email: "",
  phone: "",
  instagram: "",
  consent: false,
  website: "",
};

const inputClass =
  "mt-1.5 block min-h-12 w-full rounded-xl border-2 border-[#d3ecf9] bg-white px-4 text-base text-ink transition-colors duration-200 outline-none focus:border-mid aria-invalid:border-[#c2410c]";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string; field?: string };

export function TournamentSection() {
  const t = useT();
  const tt = t.tournament;
  const { data: info, setData: setInfo } = useApi(api.tournament);
  const [form, setForm] = useState<RegistrationForm>(emptyForm);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const date = info?.date
    ? new Intl.DateTimeFormat(t.intl, { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Warsaw" }).format(new Date(info.date))
    : tt.dateSoon;
  const closed = info !== null && (!info.registrationOpen || info.spotsLeft === 0);

  function set<K extends keyof RegistrationForm>(key: K, value: RegistrationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    try {
      setInfo(await api.register(form));
      setForm(emptyForm);
      setStatus({ kind: "sent" });
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid" && error.field) {
        setStatus({ kind: "error", message: tt.invalid[error.field] ?? tt.errors.generic, field: error.field });
      } else {
        const code = error instanceof ApiError ? error.code : "generic";
        setStatus({ kind: "error", message: tt.errors[code] ?? tt.errors.generic });
      }
    }
  }

  const invalid = (field: string) => (status.kind === "error" && status.field === field ? true : undefined);

  const textField = (key: "teamName" | "city" | "captainName" | "email" | "phone" | "instagram", label: string, type = "text", autoComplete = "off", required = true) => (
    <label className="block text-[15px] font-semibold">
      {label}
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={invalid(key)}
        className={inputClass}
      />
    </label>
  );

  return (
    <section id="tournament" className="relative overflow-hidden bg-linear-to-b from-navy via-mid via-58% to-sky px-8 py-24 text-white max-[560px]:px-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url(/images/topo.svg)] bg-size-[900px_900px] opacity-40"
      />
      <div className="relative mx-auto flex max-w-7xl flex-wrap gap-10">
        <div className="flex-[1_1_420px]">
          <h2 className="font-display text-[96px] leading-[0.9] font-black uppercase max-[560px]:text-[64px]">
            {tt.title}
          </h2>
          <p className="mt-4 font-display text-[40px] leading-none font-extrabold text-ball">{info?.name ?? "Pocket Aces Cup"}</p>
          <p className="mt-3 text-lg text-[#e3f4fd]">
            {date}
            {info && ` · ${info.place}`}
          </p>
          {info?.date && <Countdown date={info.date} />}

          <dl className="mt-8 flex flex-wrap gap-4">
            <div className="min-w-37.5 rounded-2xl bg-white/12 p-5">
              <dt className="text-sm text-[#bfe6f8]">{tt.perTeam}</dt>
              <dd className="font-display text-[44px] leading-none font-black">{info ? `${info.feePln} PLN` : "…"}</dd>
            </div>
            <div className="min-w-37.5 rounded-2xl bg-white/12 p-5">
              <dt className="text-sm text-[#bfe6f8]">{tt.spotsLeft}</dt>
              <dd className="font-display text-[44px] leading-none font-black tabular-nums">
                {info ? `${info.spotsLeft}/${info.maxTeams}` : "…"}
              </dd>
            </div>
          </dl>

          <ul className="mt-8 flex flex-col gap-2.5 text-lg">
            {tt.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3">
                <span className="size-2.5 flex-none rounded-full bg-ball" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <p className="text-sm text-[#bfe6f8]">
              {t.cup.confirmed} ({info?.confirmed ?? 0})
              {info && info.registered > (info.confirmed ?? 0) && ` · ${info.registered - (info.confirmed ?? 0)} ${t.cup.pending}`}
            </p>
            {info && info.teams.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {info.teams.map((team) => (
                  <li key={team.name} className="rounded-full bg-white/14 px-3.5 py-1.5 text-[15px] font-semibold">
                    {team.name}
                    {team.city && <span className="font-normal text-[#bfe6f8]"> · {team.city}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[15px] text-[#e3f4fd]">{tt.noTeams}</p>
            )}
          </div>
        </div>

        <div className="flex-[1_1_460px] rounded-[20px] bg-white p-8 text-ink shadow-[0_30px_60px_-30px_rgba(2,20,55,0.7)] max-[560px]:p-5">
          <h3 className="font-display text-[44px] leading-[0.9] font-black text-navy uppercase">{tt.formTitle}</h3>

          {status.kind === "sent" ? (
            <p role="status" className="mt-6 animate-pop rounded-2xl bg-[#e2f4ea] p-5 text-base font-semibold text-[#14532d] motion-reduce:animate-none">
              {tt.success}
            </p>
          ) : closed ? (
            <p className="mt-6 rounded-2xl bg-[#fff4d1] p-5 text-base font-semibold text-[#6b4e00]">
              {info?.registrationOpen ? tt.full : tt.closed}
            </p>
          ) : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
              {textField("teamName", tt.teamName)}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                {textField("city", tt.city, "text", "address-level2", false)}
                <label className="block text-[15px] font-semibold">
                  {tt.level}
                  <select
                    value={form.level}
                    onChange={(e) => set("level", e.target.value as TeamLevel)}
                    className={inputClass}
                  >
                    {(Object.keys(tt.levels) as TeamLevel[]).map((level) => (
                      <option key={level} value={level}>
                        {tt.levels[level]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {textField("captainName", tt.captainName, "text", "name")}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                {textField("email", tt.email, "email", "email")}
                {textField("phone", tt.phone, "tel", "tel")}
              </div>
              {textField("instagram", tt.instagram, "text", "off", false)}

              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                className="absolute left-[-9999px] size-px opacity-0"
              />

              <label className="flex cursor-pointer gap-3 text-[15px] leading-normal text-muted">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  aria-invalid={invalid("consent")}
                  className="mt-0.5 size-5 flex-none accent-navy"
                />
                {tt.consent}
              </label>

              {status.kind === "error" && (
                <p role="alert" className="rounded-2xl bg-[#fff4d1] p-3.5 text-[15px] font-semibold text-[#6b4e00]">
                  {status.message}
                </p>
              )}

              <button
                type="submit"
                disabled={status.kind === "sending"}
                className="inline-flex min-h-13 cursor-pointer items-center justify-center rounded-full bg-ball px-7 text-base font-bold text-ink transition-[translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-10px_rgba(255,194,31,0.85)] disabled:cursor-wait disabled:opacity-70 motion-reduce:transition-none"
              >
                {status.kind === "sending" ? tt.sending : tt.submit}
              </button>
            </form>
          )}
        </div>
      </div>
      {info && <CupView cup={info.cup} />}
    </section>
  );
}
