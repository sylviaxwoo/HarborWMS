"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "../types";
import { useWmsStore } from "../store";
import { dictionaries, type TranslationDict } from "./dictionaries";

type I18nContextValue = {
  locale: Locale;
  t: TranslationDict;
  setLocale: (locale: Locale) => void;
  statusLabel: (code: string) => string;
  errorLabel: (code: string) => string;
  localizeName: (name: {
    "zh-CN": string;
    "en-US": string;
    "es-US": string;
  }) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "en-US";
  const lang = navigator.language?.toLowerCase() ?? "en";
  if (lang.startsWith("zh")) return "zh-CN";
  if (lang.startsWith("es")) return "es-US";
  return "en-US";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useWmsStore((s) => s.locale);
  const setLocale = useWmsStore((s) => s.setLocale);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    const raw = localStorage.getItem("wms-demo-v1");
    if (!raw) {
      setLocale(detectBrowserLocale());
    }
  }, [hydrated, setLocale]);

  const t = dictionaries[locale] ?? dictionaries["en-US"];

  const statusLabel = useCallback(
    (code: string) => (t.status as Record<string, string>)[code] ?? code,
    [t]
  );

  const errorLabel = useCallback(
    (code: string) => (t.errors as Record<string, string>)[code] ?? code,
    [t]
  );

  const localizeName = useCallback(
    (name: { "zh-CN": string; "en-US": string; "es-US": string }) =>
      name[locale] || name["en-US"],
    [locale]
  );

  const value = useMemo(
    () => ({ locale, t, setLocale, statusLabel, errorLabel, localizeName }),
    [locale, t, setLocale, statusLabel, errorLabel, localizeName]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
