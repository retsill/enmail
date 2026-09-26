"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { useSystemSettings, resolveAssetUrl } from "@/lib/settings-context";
import { useLocale } from "@/i18n/context";
import { useTheme } from "@/theme/context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { SitePageLinks } from "@/components/site-page-links";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const settings = useSystemSettings();
  const { theme } = useTheme();
  const activeLogo = theme === "dark" && settings.logoUrlDark ? settings.logoUrlDark : settings.logoUrl;
  const logoUrl = resolveAssetUrl(activeLogo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await api.login(email, password);
      setSession(accessToken, user);
      router.push("/inbox");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex justify-end gap-2 p-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-3xl border border-border bg-surface px-10 py-12 shadow-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={settings.siteName} className="mb-4 h-10 w-auto" />
            ) : (
              <>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
                  {settings.siteName.charAt(0).toUpperCase()}
                </div>
                <h1 className="text-xl font-medium">{settings.siteName}</h1>
              </>
            )}
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
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input rounded-full px-4 py-3"
              placeholder={t("login.password")}
            />

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
