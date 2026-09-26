"use client";

import { useRef, useState } from "react";
import { useLocale } from "@/i18n/context";
import { useTheme } from "@/theme/context";
import { useInboxView } from "@/app/inbox/view-context";
import { CategoryIcon } from "@/components/category-icon";

// Bloque visual reutilizable: cada grupo de opciones de Ajustes va en su
// propia tarjeta con borde/sombra, en vez de texto suelto apilado — así se
// lee organizado y con jerarquía, no todo amontonado. Se usa tanto en la
// página completa de Ajustes como en el panel de ajustes rápidos.
export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <p className="mb-1 text-sm font-medium">{title}</p>
      {description ? <p className="mb-4 text-xs text-muted-foreground">{description}</p> : <div className="mb-4" />}
      {children}
    </div>
  );
}

const BACKGROUND_COLORS = [
  "#1a73e8",
  "#188038",
  "#e37400",
  "#d93025",
  "#9334e6",
  "#009688",
  "#5f6368",
  "#c2185b",
];

const TOGGLEABLE_CATEGORIES = ["SOCIAL", "PROMOTIONS", "UPDATES", "FORUMS"] as const;

// Todo lo de "Temas": tema claro/oscuro, vista (2/3/3-abajo columnas), estilo
// de redactar, correos por página, densidad, fondo personalizado y
// categorías activas. Se usa completo tanto en Ajustes > Temas como en el
// panel de ajustes rápidos que abre el ícono de engranaje (estilo Gmail) —
// por eso vive en su propio archivo en vez de adentro de la página de Ajustes.
export function ThemesSection({ showHeader = true }: { showHeader?: boolean }) {
  const { t } = useLocale();
  const { theme, setTheme } = useTheme();
  const {
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
  } = useInboxView();
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function toggleCategory(category: string) {
    const next = enabledCategories.includes(category)
      ? enabledCategories.filter((c) => c !== category)
      : [...enabledCategories, category];
    setEnabledCategories(next);
  }

  async function handleBackgroundFile(file: File) {
    setUploading(true);
    try {
      await setBackgroundImage(file);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section>
      {showHeader ? (
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
              <path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3a2 2 0 0 1 2-2h2.4a3.1 3.1 0 0 0 3.1-3.1C20.5 6.8 16.7 2 12 2Z" />
            </svg>
          </span>
          <h2 className="text-lg font-medium">{t("settings.themes")}</h2>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 text-sm">
        <SettingsCard title={`${t("theme.light")} / ${t("theme.dark")}`}>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`rounded-full border px-4 py-1.5 text-sm ${theme === "light" ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-hover"}`}
            >
              {t("theme.light")}
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`rounded-full border px-4 py-1.5 text-sm ${theme === "dark" ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-hover"}`}
            >
              {t("theme.dark")}
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title={t("view.title")}>
          <div className="flex gap-3">
            <button
              onClick={() => setColumns(2)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-2.5 ${columns === 2 ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-hover"}`}
            >
              <span className="flex h-10 w-14 overflow-hidden rounded border border-border/60 bg-background">
                <span className="w-1/2 border-r border-border/60 bg-surface-hover" />
                <span className="w-1/2 bg-surface-hover/50" />
              </span>
              <span className={columns === 2 ? "font-medium text-accent" : "text-muted-foreground"}>{t("view.columns2")}</span>
            </button>
            <button
              onClick={() => setColumns(3)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-2.5 ${columns === 3 ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-hover"}`}
            >
              <span className="flex h-10 w-14 overflow-hidden rounded border border-border/60 bg-background">
                <span className="w-1/3 border-r border-border/60 bg-surface-hover" />
                <span className="w-1/3 border-r border-border/60 bg-surface-hover/70" />
                <span className="w-1/3 bg-surface-hover/40" />
              </span>
              <span className={columns === 3 ? "font-medium text-accent" : "text-muted-foreground"}>{t("view.columns3")}</span>
            </button>
            <button
              onClick={() => setColumns(4)}
              className={`flex flex-col items-center gap-2 rounded-lg border-2 p-2.5 ${columns === 4 ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-hover"}`}
            >
              <span className="flex h-10 w-14 overflow-hidden rounded border border-border/60 bg-background">
                <span className="w-1/4 border-r border-border/60 bg-surface-hover" />
                <span className="flex w-3/4 flex-col">
                  <span className="h-1/2 border-b border-border/60 bg-surface-hover/70" />
                  <span className="h-1/2 bg-surface-hover/40" />
                </span>
              </span>
              <span className={columns === 4 ? "font-medium text-accent" : "text-muted-foreground"}>{t("view.columns3Bottom")}</span>
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title={t("view.composeStyle")}>
          <div className="flex gap-2">
            <button
              onClick={() => setComposeStyle("POPUP")}
              className={`rounded-full border px-4 py-1.5 text-sm ${composeStyle === "POPUP" ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-hover"}`}
            >
              {t("view.composePopup")}
            </button>
            <button
              onClick={() => setComposeStyle("FULLSCREEN")}
              className={`rounded-full border px-4 py-1.5 text-sm ${composeStyle === "FULLSCREEN" ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-hover"}`}
            >
              {t("view.composeFullscreen")}
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title={t("settings.pageSize")}>
          <div className="flex gap-2">
            {[25, 50, 100].map((size) => (
              <button
                key={size}
                onClick={() => setPageSize(size as 25 | 50 | 100)}
                className={`rounded-full border px-4 py-1.5 text-sm ${pageSize === size ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-hover"}`}
              >
                {size}
              </button>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title={t("settings.density")}>
          <div className="flex gap-2">
            {(["DEFAULT", "COMFORTABLE", "COMPACT"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDensity(d)}
                className={`rounded-full border px-4 py-1.5 text-sm ${density === d ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-hover"}`}
              >
                {t(`settings.density.${d.toLowerCase()}` as never)}
              </button>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard title={t("settings.background")} description={t("settings.background.description")}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={clearBackground}
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-xs ${
                themeBackgroundType === "NONE" ? "border-accent text-accent" : "border-border text-muted-foreground"
              } hover:bg-surface-hover`}
              title={t("settings.background.none")}
            >
              ✕
            </button>
            {BACKGROUND_COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setBackgroundColor(color)}
                style={{ backgroundColor: color }}
                className={`h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-surface ${
                  themeBackgroundType === "COLOR" && themeBackground === color ? "ring-accent" : "ring-transparent"
                }`}
                title={color}
              />
            ))}
            {(() => {
              const isCustomColor =
                themeBackgroundType === "COLOR" && !!themeBackground && !BACKGROUND_COLORS.includes(themeBackground);
              return (
                <label
                  title={t("settings.background.custom")}
                  style={isCustomColor ? { backgroundColor: themeBackground! } : undefined}
                  className={`relative flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-surface ${
                    isCustomColor ? "ring-accent" : "bg-[conic-gradient(from_0deg,#e63946,#f4a261,#e9c46a,#2a9d8f,#264653,#8338ec,#e63946)] ring-transparent"
                  }`}
                >
                  {!isCustomColor ? (
                    <span className="flex h-full w-full items-center justify-center rounded-full bg-surface/70">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22a10 10 0 1 1 0-20c5 0 9 3.5 9 8 0 2.5-2 4-4 4h-2a2 2 0 0 0-1 3.7c.3.6.1 1.3-.5 1.6-.4.2-1 .5-1.5.7Z" />
                        <circle cx="7.5" cy="10.5" r="1.2" fill="currentColor" />
                        <circle cx="12" cy="7" r="1.2" fill="currentColor" />
                        <circle cx="16.5" cy="10.5" r="1.2" fill="currentColor" />
                      </svg>
                    </span>
                  ) : null}
                  <input
                    type="color"
                    value={isCustomColor ? themeBackground! : "#1a73e8"}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
              );
            })()}
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleBackgroundFile(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
              disabled={uploading}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${
                themeBackgroundType === "IMAGE" ? "border-accent bg-accent-soft text-accent" : "border-border hover:bg-surface-hover"
              } disabled:opacity-60`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              {uploading ? "…" : t("settings.background.image")}
            </button>
          </div>

          {themeBackgroundType !== "NONE" ? (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-border pt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{t("settings.background.opacity")}</span>
                <span className="text-muted-foreground">{backgroundOpacity}%</span>
              </div>
              <input
                type="range"
                min={30}
                max={100}
                value={backgroundOpacity}
                onChange={(e) => setBackgroundOpacity(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <span className="text-[11px] text-muted-foreground">{t("settings.background.opacity.hint")}</span>
            </div>
          ) : null}
        </SettingsCard>

        <SettingsCard title={t("settings.categories")} description={t("settings.categories.description")}>
          <div className="flex flex-wrap gap-2">
            {TOGGLEABLE_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm ${
                  enabledCategories.includes(category)
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted-foreground hover:bg-surface-hover"
                }`}
              >
                <CategoryIcon category={category} />
                {t(`category.${category.toLowerCase()}` as never)}
              </button>
            ))}
          </div>
        </SettingsCard>
      </div>
    </section>
  );
}
