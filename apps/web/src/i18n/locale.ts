"use client";

import { useEffect, useSyncExternalStore } from "react";
import { dictionaries, type Dict, type Locale } from "./dictionaries";

const KEY = "pa-lang";
const listeners = new Set<() => void>();
let chosen: Locale | null = null;

function read(): Locale {
  if (chosen) return chosen;
  try {
    return window.localStorage.getItem(KEY) === "en" ? "en" : "pl";
  } catch {
    return "pl";
  }
}

function subscribe(listener: () => void): () => void {
  const onStorage = () => {
    chosen = null;
    listener();
  };
  listeners.add(listener);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLocale(locale: Locale): void {
  chosen = locale;
  try {
    window.localStorage.setItem(KEY, locale);
  } catch {
  }
  for (const listener of listeners) listener();
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, read, () => "pl");
}

export function useT(): Dict {
  return dictionaries[useLocale()];
}

export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
