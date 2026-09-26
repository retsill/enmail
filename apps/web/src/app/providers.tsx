"use client";

import { ThemeProvider } from "@/theme/context";
import { LocaleProvider } from "@/i18n/context";
import { SettingsProvider, useSystemSettings, isSupportedLocale } from "@/lib/settings-context";

function LocaleFromSettings({ children }: { children: React.ReactNode }) {
  const settings = useSystemSettings();
  const defaultLocale = isSupportedLocale(settings.defaultLocale) ? settings.defaultLocale : "es";
  return <LocaleProvider defaultLocale={defaultLocale}>{children}</LocaleProvider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <LocaleFromSettings>{children}</LocaleFromSettings>
      </SettingsProvider>
    </ThemeProvider>
  );
}
