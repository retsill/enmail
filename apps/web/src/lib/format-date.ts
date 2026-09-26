import type { Locale } from "@/i18n/dictionaries";

// Estilo Gmail: "9 feb" dentro del año en curso, fecha completa si es de un
// año anterior.
export function formatMessageDate(value: string | null, locale: Locale): string {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();

  if (date.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat(locale === "es" ? "es" : "en", { day: "numeric", month: "short" }).format(date);
  }
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
