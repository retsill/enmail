"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { dictionaries, SUPPORTED_LOCALES, type Locale, type TranslationKey } from "./dictionaries";

const STORAGE_KEY = "webmail_locale";

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "es";
  const short = navigator.language?.slice(0, 2);
  return (SUPPORTED_LOCALES as readonly string[]).includes(short) ? (short as Locale) : "es";
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  defaultLocale,
}: {
  children: React.ReactNode;
  defaultLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale ?? "es");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
        setLocaleState(stored);
      } else if (defaultLocale) {
        setLocaleState(defaultLocale);
      } else {
        setLocaleState(detectBrowserLocale());
      }
    } catch {
      // localStorage no disponible
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // no-op
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale]?.[key] ?? dictionaries.es[key] ?? key,
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale debe usarse dentro de LocaleProvider");
  return ctx;
}
