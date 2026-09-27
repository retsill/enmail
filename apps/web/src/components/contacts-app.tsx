"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Contact } from "@/lib/api";
import { useLocale } from "@/i18n/context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MobileAppSwitcher } from "@/components/app-rail";
import { useInboxView } from "@/app/inbox/view-context";
import { useIsMobile } from "@/lib/use-is-mobile";

// Vista de Contactos: ocupa el mismo espacio que el sidebar de carpetas +
// panel de lectura (lista buscable a la izquierda, detalle/edición a la
// derecha), siguiendo el mismo patrón de dos columnas que el correo.
export function ContactsApp({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const { t } = useLocale();
  const { toggleSidebar, closeSidebar } = useInboxView();
  const isMobile = useIsMobile();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Contact | null>(null);

  const load = useCallback(async (query?: string) => {
    try {
      setContacts(await api.contacts.list(query));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setTimeout(() => load(search || undefined), 250);
    return () => clearTimeout(id);
  }, [search, load]);

  function startCreate() {
    setSelected(null);
    setCreating(true);
    setName("");
    setEmail("");
  }

  function startEdit(contact: Contact) {
    setCreating(false);
    setSelected(contact);
    setName(contact.name ?? "");
    setEmail(contact.email);
  }

  async function handleSave() {
    if (!email.trim()) return;
    try {
      if (creating) {
        await api.contacts.create(email.trim(), name.trim() || undefined);
      } else if (selected) {
        await api.contacts.update(selected.id, { email: email.trim(), name: name.trim() || undefined });
      }
      setCreating(false);
      setSelected(null);
      await load(search || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function handleDelete(contact: Contact) {
    try {
      await api.contacts.remove(contact.id);
      if (selected?.id === contact.id) setSelected(null);
      await load(search || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
    setConfirmDelete(null);
  }

  return (
    <div className="flex min-w-0 flex-1">
      {!sidebarCollapsed ? (
        <>
        {/* Mismo patrón que el sidebar de correo: en mobile flota encima
            (drawer) en vez de compartir el ancho con el panel de detalle. */}
        <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={toggleSidebar} />
        <aside
          onClick={(e) => {
            if (isMobile && (e.target as HTMLElement).closest("button")) closeSidebar();
          }}
          className="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-3 overflow-y-auto bg-background px-3 py-4 shadow-2xl md:static md:z-auto md:border-r md:border-border md:shadow-none"
        >
          <MobileAppSwitcher />
          <button
            onClick={startCreate}
            className="flex items-center gap-3 self-start rounded-2xl bg-accent-soft px-6 py-4 text-sm font-medium text-foreground shadow-sm transition hover:shadow-md"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            {t("contacts.new")}
          </button>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("contacts.search")}
            className="input h-10 text-sm"
          />

          <div className="flex flex-col gap-0.5">
            {loading ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("reader.loading")}</p>
            ) : contacts.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">{t("contacts.empty")}</p>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => startEdit(contact)}
                  className={`flex items-center gap-3 rounded-r-full px-3 py-2 text-left text-sm ${
                    selected?.id === contact.id ? "bg-accent-soft font-medium text-accent" : "hover:bg-surface-hover"
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-medium text-accent">
                    {(contact.name || contact.email).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{contact.name || contact.email}</span>
                    {contact.name ? (
                      <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
                    ) : null}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>
        </>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col bg-surface p-6">
        {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

        {creating || selected ? (
          <div className="max-w-md">
            <h1 className="mb-5 text-lg font-medium">{creating ? t("contacts.new") : t("sidebar.editAccount")}</h1>
            <div className="flex flex-col gap-3">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("contacts.name")}</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input h-10 w-full" />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">{t("contacts.email")}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input h-10 w-full"
                />
              </label>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!email.trim()}
                  className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
                >
                  {t("addAccount.save")}
                </button>
                <button
                  onClick={() => {
                    setCreating(false);
                    setSelected(null);
                  }}
                  className="rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                >
                  {t("addAccount.cancel")}
                </button>
                {selected ? (
                  <button
                    onClick={() => setConfirmDelete(selected)}
                    className="ml-auto rounded-full border border-border px-4 py-2 text-sm text-danger hover:bg-surface-hover"
                  >
                    {t("contacts.delete")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("contacts.selectHint")}</p>
          </div>
        )}
      </main>

      {confirmDelete ? (
        <ConfirmDialog
          title={t("contacts.delete")}
          message={`${t("contacts.deleteConfirm")} (${confirmDelete.name || confirmDelete.email})`}
          danger
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      ) : null}
    </div>
  );
}
