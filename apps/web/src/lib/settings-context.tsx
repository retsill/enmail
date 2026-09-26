"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Locale } from "@/i18n/dictionaries";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const API_ORIGIN = API_URL.replace(/\/api\/?$/, "");

export interface SystemSettings {
  siteName: string;
  logoUrl: string | null;
  logoUrlDark: string | null;
  faviconUrl: string | null;
  defaultLocale: string;
}

function toAbsolute(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_ORIGIN}${path}`;
}

const defaultSettings: SystemSettings = {
  siteName: "Webmail",
  logoUrl: null,
  logoUrlDark: null,
  faviconUrl: null,
  defaultLocale: "es",
};

const SettingsContext = createContext<SystemSettings>(defaultSettings);
// Función separada (no dentro de SystemSettings) para no romper los
// `const settings = useSystemSettings()` que ya tratan el valor como el
// objeto de ajustes directo en el resto de la app.
const RefreshContext = createContext<() => Promise<void>>(async () => undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/settings/system`);
      if (!res.ok) return;
      const data = await res.json();
      setSettings({
        siteName: data.siteName ?? defaultSettings.siteName,
        logoUrl: data.logoUrl ?? null,
        logoUrlDark: data.logoUrlDark ?? null,
        faviconUrl: data.faviconUrl ?? null,
        defaultLocale: data.defaultLocale ?? defaultSettings.defaultLocale,
      });
    } catch {
      // no-op: se queda con lo último cargado
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    document.title = settings.siteName;

    const faviconHref = toAbsolute(settings.faviconUrl);
    if (faviconHref) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = faviconHref;

      // iOS ignora los íconos del manifest para "Agregar a inicio" — se fija
      // solo en este link, así que sin esto el favicon nunca aparecía como
      // ícono de la PWA en iPhone/iPad aunque el manifest estuviera bien.
      let appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
      if (!appleIcon) {
        appleIcon = document.createElement("link");
        appleIcon.rel = "apple-touch-icon";
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = faviconHref;
    }
  }, [settings.siteName, settings.faviconUrl]);

  return (
    <SettingsContext.Provider value={settings}>
      <RefreshContext.Provider value={refresh}>{children}</RefreshContext.Provider>
    </SettingsContext.Provider>
  );
}

export function useSystemSettings() {
  return useContext(SettingsContext);
}

// Llamar tras guardar/subir algo en Ajustes > Marca para que el resto de la
// app (header, login, favicon) se actualice al toque, sin recargar la página.
export function useRefreshSystemSettings() {
  return useContext(RefreshContext);
}

export function resolveAssetUrl(path: string | null): string | null {
  return toAbsolute(path);
}

export function isSupportedLocale(value: string): value is Locale {
  return value === "es" || value === "en";
}
