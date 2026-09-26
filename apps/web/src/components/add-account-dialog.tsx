"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, type Addon, type CreateMailAccountInput } from "@/lib/api";
import { useLocale } from "@/i18n/context";

const OAUTH_ICONS: Record<string, React.ReactNode> = {
  gmail: (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M5.5 6.5 12 11l6.5-4.5V6a1.5 1.5 0 0 0-1.5-1.5H7A1.5 1.5 0 0 0 5.5 6v.5Z" />
      <path fill="#34A853" d="M5.5 8.2V18a1.5 1.5 0 0 0 1.5 1.5h1V10.4L5.5 8.2Z" />
      <path fill="#FBBC05" d="M16 10.4v9.1h1A1.5 1.5 0 0 0 18.5 18V8.2L16 10.4Z" />
      <path fill="#4285F4" d="M8 10.9v8.6h8v-8.6l-4 2.8-4-2.8Z" />
      <path fill="#C5221F" d="M5.5 6v2.2L12 12.5l6.5-4.3V6a1.5 1.5 0 0 0-.7-1.27L12 9 6.2 4.73A1.5 1.5 0 0 0 5.5 6Z" />
    </svg>
  ),
  outlook: (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <rect x="2" y="5" width="13" height="14" rx="1.5" fill="#0364B8" />
      <path fill="#0A2767" d="M15 8.5 22 5v14l-7-3.5V8.5Z" />
      <circle cx="8.5" cy="12" r="3.2" fill="#fff" />
      <circle cx="8.5" cy="12" r="2.2" fill="#0364B8" />
    </svg>
  ),
};

const emptyForm: CreateMailAccountInput = {
  label: "",
  emailAddress: "",
  imapHost: "",
  imapPort: 993,
  imapTls: true,
  smtpHost: "",
  smtpPort: 587,
  smtpTls: false,
  username: "",
  password: "",
};

export function AddAccountDialog({
  addons = [],
  onClose,
  onCreated,
}: {
  addons?: Addon[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState<CreateMailAccountInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const enabledAddons = addons.filter((a) => a.enabled && (a.slug === "gmail" || a.slug === "outlook"));
  const [showManual, setShowManual] = useState(enabledAddons.length === 0);

  function update<K extends keyof CreateMailAccountInput>(key: K, value: CreateMailAccountInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.mailAccounts.create(form);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold">{t("addAccount.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            title={t("addAccount.cancel")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{t("addAccount.description")}</p>

        {enabledAddons.length > 0 ? (
          <div className="mb-4 flex flex-col gap-2">
            {enabledAddons.map((addon) => (
              <a
                key={addon.slug}
                href={api.addons.connectUrl(addon.slug)}
                className="flex items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-medium hover:bg-surface-hover"
              >
                {OAUTH_ICONS[addon.slug]}
                {t("addAccount.connectWith")} {addon.name}
              </a>
            ))}
            {!showManual ? (
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="mt-1 text-center text-xs text-muted-foreground hover:text-accent"
              >
                {t("addAccount.manualSetup")}
              </button>
            ) : null}
          </div>
        ) : null}

        {enabledAddons.length > 0 && !showManual ? null : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">
          {enabledAddons.length > 0 ? (
            <p className="text-xs font-medium text-muted-foreground">{t("addAccount.manualSetup")}</p>
          ) : null}
          <Field label={t("addAccount.label")}>
            <input
              required
              value={form.label}
              onChange={(e) => update("label", e.target.value)}
              className="input"
              placeholder="Trabajo"
            />
          </Field>
          <Field label={t("addAccount.email")}>
            <input
              type="email"
              required
              value={form.emailAddress}
              onChange={(e) => update("emailAddress", e.target.value)}
              className="input"
              placeholder="yo@midominio.com"
            />
          </Field>
          <Field label={t("addAccount.username")}>
            <input
              required
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              className="input"
            />
          </Field>
          <Field label={t("addAccount.password")}>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("addAccount.imapHost")}>
              <input
                required
                value={form.imapHost}
                onChange={(e) => update("imapHost", e.target.value)}
                className="input"
              />
            </Field>
            <Field label={t("addAccount.imapPort")}>
              <input
                type="number"
                required
                value={form.imapPort}
                onChange={(e) => update("imapPort", Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label={t("addAccount.smtpHost")}>
              <input
                required
                value={form.smtpHost}
                onChange={(e) => update("smtpHost", e.target.value)}
                className="input"
              />
            </Field>
            <Field label={t("addAccount.smtpPort")}>
              <input
                type="number"
                required
                value={form.smtpPort}
                onChange={(e) => update("smtpPort", Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>

          {error ? <p className="text-danger">{error}</p> : null}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
            >
              {t("addAccount.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
            >
              {loading ? t("addAccount.saving") : t("addAccount.save")}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
