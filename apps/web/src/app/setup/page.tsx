"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { useSystemSettings } from "@/lib/settings-context";
import { useLocale } from "@/i18n/context";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

// Wizard de primer arranque: reemplaza al admin sembrado con credenciales
// fijas — se muestra solo mientras no exista ningún usuario ADMIN todavía
// (GET /setup/status), y crea de una tanto la cuenta de administrador real
// como la configuración del servidor de correo (IMAP/SMTP), que antes no
// quedaba explicada en ningún lado del proceso de instalación.
export default function SetupPage() {
  const router = useRouter();
  const settings = useSystemSettings();
  const { t } = useLocale();

  const [checking, setChecking] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [siteName, setSiteName] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState(993);
  const [imapTls, setImapTls] = useState(true);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpTls, setSmtpTls] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.setup
      .status()
      .then((res) => {
        if (!res.needsSetup) {
          router.replace("/login");
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (adminPassword !== confirmPassword) {
      setError(t("setup.passwordMismatch"));
      return;
    }
    if (adminPassword.length < 8) {
      setError(t("setup.passwordTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      const { accessToken, user } = await api.setup.complete({
        adminName,
        adminEmail,
        adminPassword,
        siteName: siteName || undefined,
        imapHost,
        imapPort,
        imapTls,
        smtpHost,
        smtpPort,
        smtpTls,
      });
      setSession(accessToken, user);
      router.push("/inbox");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return null;

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex justify-end gap-2 p-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-xl rounded-3xl border border-border bg-surface px-10 py-12 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-medium">{t("setup.title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("setup.subtitle").replace("{siteName}", settings.siteName)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-sm">
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-foreground">{t("setup.adminSection")}</h2>
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">{t("setup.siteName")}</span>
                <input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder={settings.siteName}
                  className="input"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">{t("profile.name")}</span>
                <input required value={adminName} onChange={(e) => setAdminName(e.target.value)} className="input" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-muted-foreground">{t("login.email")}</span>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="input"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground">{t("login.password")}</span>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="input"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground">{t("profile.confirmPassword")}</span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                  />
                </label>
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-border pt-5">
              <h2 className="text-sm font-semibold text-foreground">{t("setup.mailServerSection")}</h2>
              <p className="text-xs text-muted-foreground">{t("setup.mailServerHint")}</p>
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-muted-foreground">{t("addAccount.imapHost")}</span>
                  <input
                    required
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="mail.tudominio.com"
                    className="input"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground">{t("addAccount.imapPort")}</span>
                  <input
                    type="number"
                    required
                    value={imapPort}
                    onChange={(e) => setImapPort(Number(e.target.value))}
                    className="input"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={imapTls} onChange={(e) => setImapTls(e.target.checked)} />
                {t("setup.useTls")}
              </label>

              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 flex flex-col gap-1.5">
                  <span className="text-muted-foreground">{t("addAccount.smtpHost")}</span>
                  <input
                    required
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="mail.tudominio.com"
                    className="input"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-muted-foreground">{t("addAccount.smtpPort")}</span>
                  <input
                    type="number"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="input"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={smtpTls} onChange={(e) => setSmtpTls(e.target.checked)} />
                {t("setup.useTls")}
              </label>
            </section>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? t("setup.submitting") : t("setup.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
