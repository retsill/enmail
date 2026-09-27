"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  api,
  ApiError,
  API_URL,
  type AddonConfig,
  type AppUser,
  type MailboxPasswordProviderConfig,
  type MailboxPasswordProviderType,
  type MailServerSettingsDto,
  type SitePage,
  type UserProfile,
} from "@/lib/api";
import { SimpleRichEditor } from "@/components/simple-rich-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getStoredUser, updateStoredUser, type AuthUser } from "@/lib/auth";
import { useLocale } from "@/i18n/context";
import { SUPPORTED_LOCALES } from "@/i18n/dictionaries";
import { resolveAssetUrl, useRefreshSystemSettings } from "@/lib/settings-context";
import { useInboxView } from "../view-context";
import { ThemesSection, SettingsCard } from "@/components/themes-section";

type Tab = "profile" | "themes" | "branding" | "pages" | "users" | "mailServer" | "integrations";

function TabIcon({ tab }: { tab: Tab }) {
  const common = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };
  if (tab === "profile")
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.5-7 8-7s8 3 8 7" />
      </svg>
    );
  if (tab === "themes")
    return (
      <svg {...common}>
        <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
        <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
        <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
        <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
        <path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3a2 2 0 0 1 2-2h2.4a3.1 3.1 0 0 0 3.1-3.1C20.5 6.8 16.7 2 12 2Z" />
      </svg>
    );
  if (tab === "branding")
    return (
      <svg {...common}>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    );
  if (tab === "mailServer")
    return (
      <svg {...common}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M2 7h20M6 11h.01M10 11h.01" />
      </svg>
    );
  if (tab === "pages")
    return (
      <svg {...common}>
        <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
        <path d="M14 2v5h5M8 13h8M8 17h5" />
      </svg>
    );
  if (tab === "users")
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 19c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17.5" cy="7.5" r="2.5" />
        <path d="M15 12.2c2.6.5 4.5 2.4 4.5 4.8" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

export default function SystemSettingsPage() {
  const router = useRouter();
  const { t } = useLocale();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<Tab>("profile");

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setUser(stored);
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  const isAdmin = user?.role === "ADMIN";
  const tabs: { id: Tab; label: string }[] = [
    { id: "profile", label: t("settings.profile") },
    { id: "themes", label: t("settings.themes") },
    ...(isAdmin
      ? [
          { id: "branding" as const, label: t("settings.branding") },
          { id: "pages" as const, label: t("settings.pages") },
          { id: "users" as const, label: t("settings.users") },
          { id: "mailServer" as const, label: t("settings.mailServer") },
          { id: "integrations" as const, label: t("settings.integrations") },
        ]
      : []),
  ];

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        <Link
          href="/inbox"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-base font-medium">{t("settings.title")}</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-60 shrink-0 border-r border-border bg-surface px-3 py-6">
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                tab === item.id ? "bg-accent-soft font-medium text-accent" : "text-muted-foreground hover:bg-surface-hover"
              }`}
            >
              <TabIcon tab={item.id} />
              {item.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mx-auto max-w-2xl">
            {tab === "profile" ? <ProfileSection /> : null}
            {tab === "themes" ? <ThemesSection /> : null}
            {tab === "branding" && isAdmin ? <BrandingSection /> : null}
            {tab === "pages" && isAdmin ? <PagesSection /> : null}
            {tab === "users" && isAdmin ? <UsersSection /> : null}
            {tab === "mailServer" && isAdmin ? (
              <div className="flex flex-col gap-10">
                <MailServerSection />
                <MailboxPasswordProviderSection />
              </div>
            ) : null}
            {tab === "integrations" && isAdmin ? <IntegrationsSection /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { t } = useLocale();
  const { refreshAuthUser } = useInboxView();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  // Cuentas MAIL_SERVER solo pueden cambiar su password real si el admin
  // conectó un panel de hosting compatible (ver Ajustes > Servidor de correo)
  // — sin eso, no hay ningún lado al que mandar ese cambio.
  const [mailboxPasswordManageable, setMailboxPasswordManageable] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.settings.getMailboxPasswordProviderStatus().then((s) => setMailboxPasswordManageable(s.configured));
  }, []);

  useEffect(() => {
    api.me.getProfile().then((p) => {
      setProfile(p);
      setName(p.name);
    });
  }, []);

  function applyProfile(updated: UserProfile) {
    setProfile(updated);
    updateStoredUser({ name: updated.name, avatarUrl: updated.avatarUrl });
    refreshAuthUser();
  }

  async function handleSaveName(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setSavingName(true);
    try {
      const updated = await api.me.updateProfile(name.trim());
      applyProfile(updated);
      setNameSaved(t("settings.saved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSavingName(false);
      setTimeout(() => setNameSaved(null), 2500);
    }
  }

  async function handleUploadAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      const updated = await api.me.uploadAvatar(file);
      applyProfile(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(t("profile.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("profile.passwordMismatch"));
      return;
    }
    setChangingPassword(true);
    try {
      await api.me.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(t("settings.saved"));
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setChangingPassword(false);
      setTimeout(() => setPasswordSaved(null), 2500);
    }
  }

  if (!profile) return null;
  const avatarUrl = resolveAssetUrl(profile.avatarUrl);

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <TabIcon tab="profile" />
        </span>
        <h2 className="text-lg font-medium">{t("settings.profile")}</h2>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-4 text-sm">
        <SettingsCard title={t("profile.avatar")}>
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-xl font-medium text-accent">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadAvatar(e.target.files[0])}
            />
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-hover disabled:opacity-60"
            >
              {uploadingAvatar ? "…" : t("settings.upload")}
            </button>
          </div>
        </SettingsCard>

        <SettingsCard title={t("profile.name")}>
          <form onSubmit={handleSaveName} className="flex flex-col gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
            <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
              {t("profile.email")}
              <input value={profile.email} disabled className="input opacity-60" />
            </label>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingName}
                className="w-fit rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
              >
                {t("settings.save")}
              </button>
              {nameSaved ? <span className="text-xs text-accent">{nameSaved}</span> : null}
            </div>
          </form>
        </SettingsCard>

        <SettingsCard title={t("profile.changePassword")}>
          {profile.authSource !== "LOCAL" && !mailboxPasswordManageable ? (
            <p className="text-xs text-muted-foreground">{t("profile.passwordManagedElsewhere")}</p>
          ) : (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("profile.currentPassword")}
                className="input"
              />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("profile.newPassword")}
                className="input"
              />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("profile.confirmPassword")}
                className="input"
              />
              {passwordError ? <p className="text-xs text-danger">{passwordError}</p> : null}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-fit rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
                >
                  {t("settings.save")}
                </button>
                {passwordSaved ? <span className="text-xs text-accent">{passwordSaved}</span> : null}
              </div>
            </form>
          )}
        </SettingsCard>
      </div>
    </section>
  );
}

function SavedBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mb-4 text-sm text-accent">{message}</p>;
}

function BrandingSection() {
  const { t, locale, setLocale } = useLocale();
  const refreshSystemSettings = useRefreshSystemSettings();
  const [siteName, setSiteName] = useState("");
  const [defaultLocale, setDefaultLocale] = useState("es");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUrlDark, setLogoUrlDark] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDarkInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.settings.getSystem().then((s) => {
      setSiteName(s.siteName);
      setDefaultLocale(s.defaultLocale);
      setLogoUrl(s.logoUrl);
      setLogoUrlDark(s.logoUrlDark);
      setFaviconUrl(s.faviconUrl);
    });
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.settings.updateSystem({ siteName, defaultLocale });
      setSiteName(updated.siteName);
      setSavedMessage(t("settings.saved"));
      if (defaultLocale === locale) setLocale(defaultLocale as (typeof SUPPORTED_LOCALES)[number]);
      await refreshSystemSettings();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(null), 2500);
    }
  }

  async function handleUploadLogo(file: File) {
    const updated = await api.settings.uploadLogo(file);
    setLogoUrl(updated.logoUrl);
    await refreshSystemSettings();
  }

  async function handleUploadLogoDark(file: File) {
    const updated = await api.settings.uploadLogoDark(file);
    setLogoUrlDark(updated.logoUrlDark);
    await refreshSystemSettings();
  }

  async function handleUploadFavicon(file: File) {
    const updated = await api.settings.uploadFavicon(file);
    setFaviconUrl(updated.faviconUrl);
    await refreshSystemSettings();
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">{t("settings.branding")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings.title")}</p>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      <SavedBanner message={savedMessage} />

      <form onSubmit={handleSave} className="flex flex-col gap-5 text-sm">
        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-foreground">{t("settings.siteName")}</span>
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} className="input" />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-medium text-foreground">{t("settings.language")}</span>
          <select
            value={defaultLocale}
            onChange={(e) => setDefaultLocale(e.target.value)}
            className="input"
          >
            {SUPPORTED_LOCALES.map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-1 gap-6 rounded-xl border border-border p-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">{t("settings.logo")}</span>
            <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveAssetUrl(logoUrl) ?? ""} alt="" className="h-9 w-auto rounded" />
              ) : (
                <div className="h-9 w-9 rounded bg-surface" />
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadLogo(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:bg-surface-hover"
              >
                {t("settings.upload")}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">{t("settings.logoDark")}</span>
            <div className="flex items-center gap-3 rounded-lg bg-[#202124] p-2">
              {logoUrlDark || logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveAssetUrl(logoUrlDark ?? logoUrl) ?? ""} alt="" className="h-9 w-auto rounded" />
              ) : (
                <div className="h-9 w-9 rounded bg-white/10" />
              )}
              <input
                ref={logoDarkInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadLogoDark(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => logoDarkInputRef.current?.click()}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white hover:bg-white/10"
              >
                {t("settings.upload")}
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">{t("settings.logoDark.hint")}</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-foreground">{t("settings.favicon")}</span>
            <div className="flex items-center gap-3">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resolveAssetUrl(faviconUrl) ?? ""} alt="" className="h-9 w-9 rounded" />
              ) : (
                <div className="h-9 w-9 rounded bg-surface-muted" />
              )}
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUploadFavicon(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface-hover"
              >
                {t("settings.upload")}
              </button>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
        >
          {t("settings.save")}
        </button>
      </form>
    </section>
  );
}

function MailServerSection() {
  const { t } = useLocale();
  const [server, setServer] = useState<MailServerSettingsDto>({
    imapHost: "",
    imapPort: 993,
    imapTls: true,
    smtpHost: "",
    smtpPort: 587,
    smtpTls: false,
    allowInsecureTls: false,
  });
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.settings.getMailServer().then((s) => {
      if (s) setServer(s);
    });
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await api.settings.updateMailServer(server);
      setServer(updated);
      setSavedMessage(t("settings.saved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(null), 2500);
    }
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">{t("settings.mailServer")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings.mailServer.description")}</p>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      <SavedBanner message={savedMessage} />

      <form onSubmit={handleSave} className="flex flex-col gap-5 text-sm">
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">{t("addAccount.imapHost")}</span>
            <input
              required
              value={server.imapHost}
              onChange={(e) => setServer({ ...server, imapHost: e.target.value })}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">{t("addAccount.imapPort")}</span>
            <input
              type="number"
              required
              value={server.imapPort}
              onChange={(e) => setServer({ ...server, imapPort: Number(e.target.value) })}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">{t("addAccount.smtpHost")}</span>
            <input
              required
              value={server.smtpHost}
              onChange={(e) => setServer({ ...server, smtpHost: e.target.value })}
              className="input"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">{t("addAccount.smtpPort")}</span>
            <input
              type="number"
              required
              value={server.smtpPort}
              onChange={(e) => setServer({ ...server, smtpPort: Number(e.target.value) })}
              className="input"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={server.imapTls}
              onChange={(e) => setServer({ ...server, imapTls: e.target.checked })}
            />
            IMAP TLS
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={server.smtpTls}
              onChange={(e) => setServer({ ...server, smtpTls: e.target.checked })}
            />
            SMTP TLS
          </label>
        </div>

        <div className="rounded-xl border border-border p-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={server.allowInsecureTls ?? false}
              onChange={(e) => setServer({ ...server, allowInsecureTls: e.target.checked })}
            />
            <span>
              <span className="font-medium text-foreground">{t("settings.mailServer.allowInsecureTls")}</span>
              <br />
              <span className="text-xs text-muted-foreground">{t("settings.mailServer.allowInsecureTls.hint")}</span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-2 w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
        >
          {t("settings.save")}
        </button>
      </form>
    </section>
  );
}

function MailboxPasswordProviderSection() {
  const { t } = useLocale();
  const [config, setConfig] = useState<MailboxPasswordProviderConfig>({
    provider: "NONE",
    baseUrl: "",
    username: "",
    allowInsecureTls: false,
    hasSecret: false,
  });
  const [secret, setSecret] = useState("");
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.settings.getMailboxPasswordProvider().then(setConfig);
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setTestMessage(null);
    setSaving(true);
    try {
      const updated = await api.settings.updateMailboxPasswordProvider({
        provider: config.provider,
        baseUrl: config.baseUrl,
        username: config.username,
        allowInsecureTls: config.allowInsecureTls,
        ...(secret ? { secret } : {}),
      });
      setConfig(updated);
      setSecret("");
      setSavedMessage(t("settings.saved"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMessage(null), 2500);
    }
  }

  async function handleTest() {
    setError(null);
    setTestMessage(null);
    setTesting(true);
    try {
      await api.settings.testMailboxPasswordProvider({
        provider: config.provider,
        baseUrl: config.baseUrl,
        username: config.username,
        allowInsecureTls: config.allowInsecureTls,
        ...(secret ? { secret } : {}),
      });
      setTestMessage(t("settings.mailboxPasswordProvider.testOk"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setTesting(false);
    }
  }

  const providerOptions: { value: MailboxPasswordProviderType; label: string }[] = [
    { value: "NONE", label: t("settings.mailboxPasswordProvider.none") },
    { value: "CPANEL", label: "cPanel" },
    { value: "PLESK", label: "Plesk" },
    { value: "AAPANEL", label: "aaPanel" },
  ];

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">{t("settings.mailboxPasswordProvider")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings.mailboxPasswordProvider.description")}</p>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}
      {testMessage ? <p className="mb-4 text-sm text-accent">{testMessage}</p> : null}
      <SavedBanner message={savedMessage} />

      <form onSubmit={handleSave} className="flex flex-col gap-5 text-sm">
        <label className="flex max-w-xs flex-col gap-1.5">
          <span className="text-xs font-medium text-foreground">{t("settings.mailboxPasswordProvider.provider")}</span>
          <select
            value={config.provider}
            onChange={(e) => setConfig({ ...config, provider: e.target.value as MailboxPasswordProviderType })}
            className="input"
          >
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {config.provider !== "NONE" ? (
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4">
            <label className="col-span-2 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">{t("settings.mailboxPasswordProvider.baseUrl")}</span>
              <input
                required
                placeholder="https://host:puerto"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                className="input"
              />
              <span className="text-xs text-muted-foreground">
                {t("settings.mailboxPasswordProvider.baseUrl.hint")}
              </span>
            </label>
            {config.provider !== "AAPANEL" ? (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">
                  {t("settings.mailboxPasswordProvider.username")}
                </span>
                <input
                  value={config.username}
                  onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  className="input"
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                {config.provider === "CPANEL"
                  ? t("settings.mailboxPasswordProvider.secret.token")
                  : t("settings.mailboxPasswordProvider.secret.password")}
              </span>
              <input
                type="password"
                placeholder={config.hasSecret ? "••••••••" : ""}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="input"
              />
            </label>

            <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={config.allowInsecureTls}
                onChange={(e) => setConfig({ ...config, allowInsecureTls: e.target.checked })}
              />
              {t("settings.mailboxPasswordProvider.allowInsecureTls")}
            </label>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
          >
            {t("settings.save")}
          </button>
          {config.provider !== "NONE" ? (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !config.baseUrl}
              className="w-fit rounded-full border border-border px-5 py-2 text-sm hover:bg-surface-hover disabled:opacity-60"
            >
              {testing ? "…" : t("settings.mailboxPasswordProvider.test")}
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function IntegrationsSection() {
  const { t } = useLocale();
  const [configs, setConfigs] = useState<AddonConfig[]>([]);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  useEffect(() => {
    api.addons.list().then(async (addons) => {
      const withConfig = await Promise.all(
        addons
          .filter((a) => a.slug === "gmail" || a.slug === "outlook")
          .map((a) => api.addons.getConfig(a.slug)),
      );
      setConfigs(withConfig);
    });
  }, []);

  async function saveConfig(slug: string, patch: Partial<AddonConfig> & { clientSecret?: string }) {
    const updated = await api.addons.updateConfig(slug, patch);
    setConfigs((prev) => prev.map((c) => (c.slug === slug ? updated : c)));
    setSavedSlug(slug);
    setTimeout(() => setSavedSlug(null), 2000);
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">{t("settings.integrations")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings.integrations.description")}</p>

      <div className="flex flex-col gap-4">
        {configs.map((config) => (
          <IntegrationRow
            key={config.slug}
            config={config}
            saved={savedSlug === config.slug}
            onSave={(patch) => saveConfig(config.slug, patch)}
          />
        ))}
      </div>
    </section>
  );
}

function IntegrationRow({
  config,
  saved,
  onSave,
}: {
  config: AddonConfig;
  saved: boolean;
  onSave: (patch: Partial<AddonConfig> & { clientSecret?: string }) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(config.enabled);
  const [clientId, setClientId] = useState(config.clientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState(
    config.redirectUri ?? `${API_URL}/oauth/${config.slug}/callback`,
  );

  return (
    <div className="rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
      >
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${config.enabled ? "bg-accent" : "bg-muted-foreground"}`}
          />
          <span className="font-medium">{config.name}</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave({ enabled, clientId, redirectUri, ...(clientSecret ? { clientSecret } : {}) });
          }}
          className="flex flex-col gap-3 border-t border-border p-4 text-sm"
        >
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            {t("settings.integrations.enabled")}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">{t("settings.integrations.clientId")}</span>
            <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="input" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">
              {t("settings.integrations.clientSecret")}
            </span>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder={config.hasClientSecret ? "••••••••" : ""}
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-foreground">
              {t("settings.integrations.redirectUri")}
            </span>
            <input value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} className="input" />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="w-fit rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
            >
              {t("settings.save")}
            </button>
            {saved ? <span className="text-xs text-accent">{t("settings.saved")}</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}

// Páginas dinámicas (Términos, Privacidad, etc.): el admin las arma acá con
// título + contenido enriquecido, en vez de que estén fijas en el código —
// el título sale en el footer/login y el contenido se abre en un modal.
function PagesSection() {
  const { t } = useLocale();
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function load() {
    api.settings
      .listPages()
      .then(setPages)
      .catch(() => setError(t("login.error.generic")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startNew() {
    setEditingId("new");
    setTitle("");
    setContent("");
    setError(null);
  }

  function startEdit(page: SitePage) {
    setEditingId(page.id);
    setTitle(page.title);
    setContent(page.content);
    setError(null);
  }

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        await api.settings.createPage({ title: title.trim(), content });
      } else if (editingId) {
        await api.settings.updatePage(editingId, { title: title.trim(), content });
      }
      setEditingId(null);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    await api.settings.deletePage(id).catch(() => undefined);
    load();
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">{t("settings.pages")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings.pages.description")}</p>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {editingId ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{t("settings.pages.pageTitle")}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("settings.pages.pageTitlePlaceholder")}
              className="input"
            />
          </label>
          {/* div, no <label>: un <label> reenvía cualquier click dentro de
              él al primer control "labelable" que encuentre — en el editor
              eso es el botón de tipo de letra, así que cada click en el
              campo de texto también disparaba ese botón. */}
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">{t("settings.pages.content")}</span>
            <SimpleRichEditor value={content} onChange={setContent} minHeight={240} />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={handleSave}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
            >
              {saving ? t("addAccount.saving") : t("addAccount.save")}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-full border border-border px-4 py-1.5 text-xs hover:bg-surface-muted"
            >
              {t("addAccount.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startNew}
          className="mb-4 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover"
        >
          {t("settings.pages.add")}
        </button>
      )}

      {!loading && !editingId ? (
        pages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("settings.pages.empty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {pages.map((page) => (
              <li key={page.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate font-medium">{page.title}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(page)}
                    className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-muted"
                  >
                    {t("sidebar.editAccount")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(page.id)}
                    className="rounded-full border border-border px-3 py-1 text-xs text-danger hover:bg-surface-muted"
                  >
                    {t("addAccount.delete")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {confirmDeleteId ? (
        <ConfirmDialog
          title={t("addAccount.delete")}
          message={t("settings.pages.deleteConfirm")}
          danger
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      ) : null}
    </section>
  );
}

// Convertir una casilla real (authSource MAIL_SERVER, se logueó sola contra
// el servidor de correo) en administrador del webmail — antes esto no se
// podía hacer desde ningún lado, había que editar la base de datos a mano.
function UsersSection() {
  const { t } = useLocale();
  const currentUser = getStoredUser();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  function load() {
    api.users
      .list()
      .then(setUsers)
      .catch(() => setError(t("login.error.generic")))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleRole(target: AppUser) {
    const nextRole = target.role === "ADMIN" ? "USER" : "ADMIN";
    setUpdatingId(target.id);
    setError(null);
    try {
      const updated = await api.users.setRole(target.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section>
      <h2 className="mb-1 text-lg font-medium">{t("settings.users")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("settings.users.description")}</p>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      {!loading ? (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {u.name} {u.id === currentUser?.id ? <span className="text-xs text-muted-foreground">({t("settings.users.you")})</span> : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · {u.authSource === "MAIL_SERVER" ? t("settings.users.mailAccount") : t("settings.users.localAccount")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    u.role === "ADMIN" ? "bg-accent-soft text-accent" : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {u.role === "ADMIN" ? t("settings.users.admin") : t("settings.users.user")}
                </span>
                <button
                  type="button"
                  disabled={u.id === currentUser?.id || updatingId === u.id}
                  onClick={() => toggleRole(u)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-muted disabled:opacity-50"
                >
                  {updatingId === u.id
                    ? "…"
                    : u.role === "ADMIN"
                      ? t("settings.users.demote")
                      : t("settings.users.promote")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
