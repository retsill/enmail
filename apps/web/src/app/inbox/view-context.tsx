"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getStoredUser, type AuthUser } from "@/lib/auth";

type ComposeStyle = "POPUP" | "FULLSCREEN";
type PageSize = 25 | 50 | 100;
type Density = "DEFAULT" | "COMFORTABLE" | "COMPACT";
type ThemeBackgroundType = "NONE" | "COLOR" | "IMAGE";
export type InboxApp = "mail" | "contacts";

const ALL_CATEGORIES = ["SOCIAL", "PROMOTIONS", "UPDATES", "FORUMS"] as const;

interface InboxViewValue {
  // 4 = "3 columnas, vista abajo": lista + panel de lectura apilados en
  // vertical en vez de lado a lado (mismo concepto que 3, solo cambia la
  // orientación del divisor arrastrable).
  columns: 2 | 3 | 4;
  setColumns: (columns: 2 | 3 | 4) => void;
  composeStyle: ComposeStyle;
  setComposeStyle: (style: ComposeStyle) => void;
  pageSize: PageSize;
  setPageSize: (size: PageSize) => void;
  density: Density;
  setDensity: (density: Density) => void;
  themeBackgroundType: ThemeBackgroundType;
  themeBackground: string | null;
  setBackgroundColor: (color: string) => void;
  setBackgroundImage: (file: File) => Promise<void>;
  clearBackground: () => void;
  // Qué tan opaco se ve header/sidebar/lista/ajustes sobre el fondo
  // personalizado (30-100). Solo tiene efecto visual si themeBackgroundType
  // no es NONE.
  backgroundOpacity: number;
  setBackgroundOpacity: (opacity: number) => void;
  enabledCategories: string[];
  setEnabledCategories: (categories: string[]) => void;
  activeApp: InboxApp;
  setActiveApp: (app: InboxApp) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  authUser: AuthUser | null;
  refreshAuthUser: () => void;
}

const InboxViewContext = createContext<InboxViewValue | null>(null);

export function InboxViewProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumnsState] = useState<2 | 3 | 4>(2);
  const [composeStyle, setComposeStyleState] = useState<ComposeStyle>("POPUP");
  const [pageSize, setPageSizeState] = useState<PageSize>(50);
  const [density, setDensityState] = useState<Density>("DEFAULT");
  const [themeBackgroundType, setThemeBackgroundType] = useState<ThemeBackgroundType>("NONE");
  const [themeBackground, setThemeBackground] = useState<string | null>(null);
  const [backgroundOpacity, setBackgroundOpacityState] = useState(82);
  const opacitySaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [enabledCategories, setEnabledCategoriesState] = useState<string[]>([...ALL_CATEGORIES]);
  const [activeApp, setActiveApp] = useState<InboxApp>("mail");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setAuthUser(getStoredUser());
  }, []);

  // Tras editar nombre/avatar en Ajustes, refresca el usuario mostrado en el
  // header sin necesitar recargar la página (Ajustes vive bajo el mismo
  // layout persistente, así que su propio estado local no se re-monta solo).
  function refreshAuthUser() {
    setAuthUser(getStoredUser());
  }

  useEffect(() => {
    api.me
      .getPreferences()
      .then((p) => {
        setColumnsState(p.layoutColumns);
        setComposeStyleState(p.composeStyle);
        setPageSizeState(p.pageSize);
        setDensityState(p.density);
        setThemeBackgroundType(p.themeBackgroundType);
        setThemeBackground(p.themeBackground);
        setBackgroundOpacityState(p.backgroundOpacity ?? 82);
        setEnabledCategoriesState(p.enabledCategories ?? [...ALL_CATEGORIES]);
      })
      .catch(() => undefined);
  }, []);

  function setColumns(next: 2 | 3 | 4) {
    setColumnsState(next);
    api.me.updatePreferences({ layoutColumns: next }).catch(() => undefined);
  }

  function setComposeStyle(next: ComposeStyle) {
    setComposeStyleState(next);
    api.me.updatePreferences({ composeStyle: next }).catch(() => undefined);
  }

  function setPageSize(next: PageSize) {
    setPageSizeState(next);
    api.me.updatePreferences({ pageSize: next }).catch(() => undefined);
  }

  function setDensity(next: Density) {
    setDensityState(next);
    api.me.updatePreferences({ density: next }).catch(() => undefined);
  }

  function setBackgroundColor(color: string) {
    setThemeBackgroundType("COLOR");
    setThemeBackground(color);
    api.me.updatePreferences({ themeBackgroundType: "COLOR", themeBackground: color }).catch(() => undefined);
  }

  async function setBackgroundImage(file: File) {
    const updated = await api.me.uploadBackground(file);
    setThemeBackgroundType(updated.themeBackgroundType);
    setThemeBackground(updated.themeBackground);
  }

  function clearBackground() {
    setThemeBackgroundType("NONE");
    api.me.updatePreferences({ themeBackgroundType: "NONE" }).catch(() => undefined);
  }

  // Debounced: el slider dispara onChange en cada tick mientras se arrastra,
  // no queremos un request por cada uno.
  function setBackgroundOpacity(next: number) {
    setBackgroundOpacityState(next);
    if (opacitySaveTimeout.current) clearTimeout(opacitySaveTimeout.current);
    opacitySaveTimeout.current = setTimeout(() => {
      api.me.updatePreferences({ backgroundOpacity: next }).catch(() => undefined);
    }, 400);
  }

  function setEnabledCategories(next: string[]) {
    setEnabledCategoriesState(next);
    api.me.updatePreferences({ enabledCategories: next }).catch(() => undefined);
  }

  function toggleSidebar() {
    setSidebarCollapsed((prev) => !prev);
  }

  const value = useMemo(
    () => ({
      columns,
      setColumns,
      composeStyle,
      setComposeStyle,
      pageSize,
      setPageSize,
      density,
      setDensity,
      themeBackgroundType,
      themeBackground,
      setBackgroundColor,
      setBackgroundImage,
      clearBackground,
      backgroundOpacity,
      setBackgroundOpacity,
      enabledCategories,
      setEnabledCategories,
      activeApp,
      setActiveApp,
      sidebarCollapsed,
      toggleSidebar,
      authUser,
      refreshAuthUser,
    }),
    [
      columns,
      composeStyle,
      pageSize,
      density,
      themeBackgroundType,
      themeBackground,
      backgroundOpacity,
      enabledCategories,
      activeApp,
      sidebarCollapsed,
      authUser,
    ],
  );
  return <InboxViewContext.Provider value={value}>{children}</InboxViewContext.Provider>;
}

export function useInboxView() {
  const ctx = useContext(InboxViewContext);
  if (!ctx) throw new Error("useInboxView debe usarse dentro de InboxViewProvider");
  return ctx;
}
