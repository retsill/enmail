"use client";

import { useState, type FormEvent } from "react";
import { api, ApiError, type MailAccount } from "@/lib/api";
import { useLocale } from "@/i18n/context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SimpleRichEditor } from "@/components/simple-rich-editor";

export function EditAccountDialog({
  account,
  onClose,
  onSaved,
  onDeleted,
}: {
  account: MailAccount;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { t } = useLocale();
  const [label, setLabel] = useState(account.label);
  const [displayName, setDisplayName] = useState(account.displayName ?? "");
  const [username, setUsername] = useState(account.username ?? "");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState(account.imapHost ?? "");
  const [imapPort, setImapPort] = useState(account.imapPort ?? 993);
  const [smtpHost, setSmtpHost] = useState(account.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(account.smtpPort ?? 587);
  const [signature, setSignature] = useState(account.signature ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);

  const isOAuth = account.provider !== "IMAP";

  async function handleSetPrimary() {
    setSettingPrimary(true);
    try {
      await api.mailAccounts.setPrimary(account.id);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setSettingPrimary(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.mailAccounts.update(account.id, {
        label,
        signature,
        displayName,
        ...(isOAuth
          ? {}
          : {
              username,
              imapHost,
              imapPort,
              smtpHost,
              smtpPort,
              ...(password ? { password } : {}),
            }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setConfirmingDelete(false);
    try {
      await api.mailAccounts.remove(account.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    }
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold">{account.emailAddress}</h2>
          {account.isPrimary ? (
            <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />
              </svg>
              {t("addAccount.primary")}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSetPrimary}
              disabled={settingPrimary}
              className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-surface-hover disabled:opacity-60"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />
              </svg>
              {settingPrimary ? "…" : t("addAccount.setPrimary")}
            </button>
          )}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{account.provider}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-sm">
          <Field label={t("addAccount.label")}>
            <input required value={label} onChange={(e) => setLabel(e.target.value)} className="input" />
          </Field>

          <Field label={t("addAccount.displayName")}>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={account.emailAddress}
              className="input"
            />
          </Field>

          {!isOAuth ? (
            <>
              <Field label={t("addAccount.username")}>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                />
              </Field>
              <Field label={t("addAccount.password")}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("addAccount.passwordKeep")}
                  className="input"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("addAccount.imapHost")}>
                  <input
                    required
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label={t("addAccount.imapPort")}>
                  <input
                    type="number"
                    required
                    value={imapPort}
                    onChange={(e) => setImapPort(Number(e.target.value))}
                    className="input"
                  />
                </Field>
                <Field label={t("addAccount.smtpHost")}>
                  <input
                    required
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label={t("addAccount.smtpPort")}>
                  <input
                    type="number"
                    required
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    className="input"
                  />
                </Field>
              </div>
            </>
          ) : null}

          {/* div, no <label>: un <label> reenvía cualquier click dentro de
              él al primer control "labelable" que encuentre — en el editor
              eso es el botón de tipo de letra, así que cada click en el
              campo de texto también disparaba ese botón. */}
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">{t("addAccount.signature")}</span>
            <SimpleRichEditor value={signature} onChange={setSignature} minHeight={180} />
          </div>

          {error ? <p className="text-danger">{error}</p> : null}

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-xs text-danger hover:underline"
            >
              {t("addAccount.delete")}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
              >
                {t("addAccount.cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
              >
                {saving ? t("addAccount.saving") : t("addAccount.save")}
              </button>
            </div>
          </div>
        </form>
      </div>

      {confirmingDelete ? (
        <ConfirmDialog
          title={t("addAccount.delete")}
          message={`${t("addAccount.deleteConfirm")} (${account.emailAddress})`}
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
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
