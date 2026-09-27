"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { useSystemSettings, resolveAssetUrl, DEFAULT_LOGO_LIGHT, DEFAULT_LOGO_DARK } from "@/lib/settings-context";
import { useLocale } from "@/i18n/context";
import { useTheme } from "@/theme/context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SitePageLinks } from "@/components/site-page-links";

const REMEMBER_EMAIL_KEY = "enmail_remembered_email";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const settings = useSystemSettings();
  const { theme } = useTheme();
  // Sin logo propio subido todavía: usa el default embebido de la app en
  // vez de la burbuja genérica con la inicial del nombre.
  const activeLogo = theme === "dark" && settings.logoUrlDark ? settings.logoUrlDark : settings.logoUrl;
  const defaultLogo = theme === "dark" ? DEFAULT_LOGO_DARK : DEFAULT_LOGO_LIGHT;
  const logoUrl = resolveAssetUrl(activeLogo) ?? defaultLogo;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Instalación recién levantada (todavía sin ningún admin): manda al
  // wizard de /setup en vez de mostrar un login que nadie puede pasar.
  useEffect(() => {
    api.setup
      .status()
      .then((res) => {
        if (res.needsSetup) {
          router.replace("/setup");
          return;
        }
        setCheckingSetup(false);
      })
      .catch(() => setCheckingSetup(false));
  }, [router]);

  // Solo el email (nunca la contraseña) se guarda en localStorage, para
  // no tener que retiparlo cada vez sin guardar nada sensible.
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await api.login(email, password);
      if (rememberMe) localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
      setSession(accessToken, user);
      router.push("/inbox");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSetup) return null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex justify-end gap-2 p-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-surface px-10 py-12 shadow-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={settings.siteName} className="mb-4 h-10 w-auto" />
            <p className="mt-2 text-sm text-muted-foreground">{t("login.subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input rounded-full px-4 py-3"
              placeholder={t("login.email")}
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full rounded-full px-4 py-3 pr-11"
                placeholder={t("login.password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 2l20 20M9.9 9.9a3 3 0 0 0 4.2 4.2M6.1 6.1C3.7 7.8 2 10 2 12c0 0 4 7 10 7 2 0 3.8-.6 5.3-1.5M17.9 17.9C19.9 16.4 21.4 14.2 22 12c0 0-2.4-4.3-6.2-6.1" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>

            <label className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              {t("login.rememberMe")}
            </label>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
            >
              {loading ? t("login.submitting") : t("login.submit")}
            </button>
          </form>
        </div>
      </div>

      <SitePageLinks className="flex flex-wrap items-center justify-center gap-1.5 pb-2 text-center text-xs text-muted-foreground" />
      <p className="pb-4 text-center text-[11px] text-muted-foreground/70">{t("footer.copyright")}</p>
    </div>
  );
}
