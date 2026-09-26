"use client";

import { useLocale } from "@/i18n/context";
import { SUPPORTED_LOCALES } from "@/i18n/dictionaries";

const LABELS: Record<string, string> = { es: "ES", en: "EN" };

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as (typeof SUPPORTED_LOCALES)[number])}
      className="h-9 rounded-full border border-border bg-surface px-3 text-xs hover:bg-surface-hover"
      aria-label="Idioma"
    >
      {SUPPORTED_LOCALES.map((code) => (
        <option key={code} value={code}>
          {LABELS[code]}
        </option>
      ))}
    </select>
  );
}
