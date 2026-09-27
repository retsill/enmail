"use client";

import { useLocale } from "@/i18n/context";
import { useInboxView, type InboxApp } from "@/app/inbox/view-context";

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] ${
        active ? "bg-accent-soft font-medium text-accent" : "text-muted-foreground hover:bg-surface-hover"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

// Riel angosto a la izquierda del sidebar (estilo Gmail: Mail/Chat/Meet),
// para cambiar qué se muestra en ese sidebar sin salir de la vista actual.
// Oculto en mobile (md:flex): ahí ocupa demasiado espacio de una pantalla ya
// angosta — el mismo cambio de app vive dentro del drawer del sidebar (ver
// MobileAppSwitcher), que solo aparece cuando el usuario lo abre a propósito.
export function AppRail() {
  const { t } = useLocale();
  const { activeApp, setActiveApp } = useInboxView();

  function select(app: InboxApp) {
    setActiveApp(app);
  }

  return (
    <nav className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-background px-1.5 py-3 md:flex">
      <RailButton active={activeApp === "mail"} label={t("rail.mail")} onClick={() => select("mail")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
        </svg>
      </RailButton>
      <RailButton active={activeApp === "contacts"} label={t("rail.contacts")} onClick={() => select("contacts")}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </RailButton>
    </nav>
  );
}

// Reemplazo del AppRail dentro del drawer del sidebar en mobile (md:hidden):
// un par de pestañas Correo/Contactos arriba de todo, en vez del riel
// permanente que en un teléfono se comía espacio útil de la pantalla.
export function MobileAppSwitcher() {
  const { t } = useLocale();
  const { activeApp, setActiveApp } = useInboxView();

  return (
    <div className="mb-1 flex gap-1 rounded-full bg-surface-muted p-1 md:hidden">
      <button
        onClick={() => setActiveApp("mail")}
        className={`flex-1 rounded-full py-1.5 text-xs font-medium ${
          activeApp === "mail" ? "bg-surface shadow-sm" : "text-muted-foreground"
        }`}
      >
        {t("rail.mail")}
      </button>
      <button
        onClick={() => setActiveApp("contacts")}
        className={`flex-1 rounded-full py-1.5 text-xs font-medium ${
          activeApp === "contacts" ? "bg-surface shadow-sm" : "text-muted-foreground"
        }`}
      >
        {t("rail.contacts")}
      </button>
    </div>
  );
}
