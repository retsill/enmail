"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { clearSession, getStoredUser, getToken, type AuthUser } from "@/lib/auth";
import { useSystemSettings, resolveAssetUrl, DEFAULT_LOGO_LIGHT, DEFAULT_LOGO_DARK } from "@/lib/settings-context";
import { useLocale } from "@/i18n/context";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/theme/context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { InboxFooter } from "@/components/inbox-footer";
import { InboxSearchProvider, useInboxSearch } from "./search-context";
import { InboxViewProvider, useInboxView } from "./view-context";
import { ThemesSection } from "@/components/themes-section";

// Aplica el fondo personalizado (color sólido o imagen subida) al body de
// la app y marca <html data-custom-bg="true">. Ese atributo es lo que hace
// que los paneles (header, sidebar, contenido, ajustes) pasen a ser
// translúcidos con blur en vez de opacos — así el fondo se ve A TRAVÉS de
// toda la app (como Gmail), no solo alrededor del borde.
function BackgroundEffect() {
  const { themeBackgroundType, themeBackground, backgroundOpacity } = useInboxView();

  useEffect(() => {
    const root = document.documentElement;
    if (themeBackgroundType === "COLOR" && themeBackground) {
      document.body.style.backgroundColor = themeBackground;
      document.body.style.backgroundImage = "";
      root.dataset.customBg = "true";
    } else if (themeBackgroundType === "IMAGE" && themeBackground) {
      const url = resolveAssetUrl(themeBackground);
      document.body.style.backgroundImage = url ? `url(${JSON.stringify(url)})` : "";
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
      root.dataset.customBg = "true";
    } else {
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = "";
      delete root.dataset.customBg;
    }
    // Nivel de transparencia elegido en Ajustes > Temas (30-100) — se pasa
    // como variable CSS y globals.css deriva de ahí surface/muted/hover.
    root.style.setProperty("--bg-opacity", String(backgroundOpacity / 100));
    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.backgroundImage = "";
      delete root.dataset.customBg;
      root.style.removeProperty("--bg-opacity");
    };
  }, [themeBackgroundType, themeBackground, backgroundOpacity]);

  return null;
}

function SearchBar() {
  const { t } = useLocale();
  const { search, setSearch } = useInboxSearch();

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("topbar.search")}
        className="input h-12 w-full rounded-xl border-transparent bg-surface-muted pl-11 focus:bg-surface focus:shadow-sm"
      />
    </div>
  );
}

function IconButton({
  children,
  onClick,
  title,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  href?: string;
}) {
  const className =
    "flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-surface-hover";
  if (href) {
    return (
      <Link href={href} title={title} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} title={title} className={className}>
      {children}
    </button>
  );
}

// Panel de ajustes rápidos (estilo Gmail): se desliza desde la derecha con
// lo de "Temas" completo (tema, vista, densidad, fondo, categorías) más un
// botón arriba para ir a Ajustes completo — sin salir de la bandeja.
function QuickSettingsPanel({ onClose }: { onClose: () => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="modal-backdrop fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className={`absolute inset-y-0 right-0 flex w-full max-w-sm flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-medium">{t("quickSettings.title")}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="shrink-0 px-5 py-3">
          <Link
            href="/inbox/settings"
            onClick={onClose}
            className="block w-full rounded-full border border-border px-4 py-2 text-center text-sm hover:bg-surface-hover"
          >
            {t("quickSettings.viewAll")}
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
          <ThemesSection showHeader={false} />
        </div>
      </div>
    </div>
  );
}

function InboxHeader({
  user,
  onLogout,
  onOpenQuickSettings,
}: {
  user: AuthUser | null;
  onLogout: () => void;
  onOpenQuickSettings: () => void;
}) {
  const { t } = useLocale();
  const settings = useSystemSettings();
  const { theme } = useTheme();
  const activeLogo = theme === "dark" && settings.logoUrlDark ? settings.logoUrlDark : settings.logoUrl;
  const defaultLogo = theme === "dark" ? DEFAULT_LOGO_DARK : DEFAULT_LOGO_LIGHT;
  const logoUrl = resolveAssetUrl(activeLogo) ?? defaultLogo;
  const { toggleSidebar, authUser } = useInboxView();
  const displayUser = authUser ?? user;

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-3">
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          title={t("sidebar.toggle")}
          className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface-hover"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <Link href="/inbox" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={settings.siteName} className="h-7 w-auto" />
        </Link>
      </div>

      <div className="flex-1">
        <SearchBar />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <LocaleSwitcher />
        <ThemeToggle />
        <IconButton onClick={onOpenQuickSettings} title={t("topbar.settings")}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 0 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 0 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 0 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z" />
          </svg>
        </IconButton>
        {displayUser?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveAssetUrl(displayUser.avatarUrl) ?? ""}
            alt=""
            className="ml-1 h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
            {(displayUser?.name || displayUser?.email || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <button
          onClick={onLogout}
          className="ml-1 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
        >
          {t("topbar.logout")}
        </button>
      </div>
    </header>
  );
}

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setUser(getStoredUser());
    setChecked(true);
  }, [router]);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  if (!checked) return null;

  return (
    <InboxSearchProvider>
      <InboxViewProvider>
        <InboxShell user={user} onLogout={handleLogout}>
          {children}
        </InboxShell>
      </InboxViewProvider>
    </InboxSearchProvider>
  );
}

// Con un fondo personalizado activo, el shell flota en una tarjeta con
// margen y bordes redondeados para que el fondo se note alrededor, y
// además los paneles internos (header/sidebar/lista/ajustes) quedan
// translúcidos con blur vía CSS (ver globals.css) para que el fondo se
// note también por dentro, no solo en el borde.
function InboxShell({
  user,
  onLogout,
  children,
}: {
  user: AuthUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const { themeBackgroundType } = useInboxView();
  const hasBackground = themeBackgroundType !== "NONE";
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  return (
    <>
      <BackgroundEffect />
      <div
        className={`flex h-screen flex-col ${
          hasBackground
            ? "m-2 h-[calc(100vh-1rem)] overflow-hidden rounded-2xl border border-border shadow-lg sm:m-3 sm:h-[calc(100vh-1.5rem)]"
            : ""
        }`}
      >
        <InboxHeader user={user} onLogout={onLogout} onOpenQuickSettings={() => setShowQuickSettings(true)} />
        <div className="min-h-0 flex-1">{children}</div>
        <InboxFooter />
      </div>
      {showQuickSettings ? <QuickSettingsPanel onClose={() => setShowQuickSettings(false)} /> : null}
    </>
  );
}
