"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { api, type MailFolder } from "@/lib/api";
import { folderDisplayName } from "@/lib/folder-display";
import { useLocale } from "@/i18n/context";
import { FolderIcon } from "@/components/folder-icon";

export function MoveToMenu({
  accountId,
  onMove,
}: {
  accountId: string;
  onMove: (folderId: string) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<MailFolder[] | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [query, setQuery] = useState("");

  async function handleOpen(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    // El menú mide w-64 (256px) — en un teléfono angosto, si el botón que lo
    // abre está cerca del borde derecho (como acá, entre los últimos íconos
    // de la barra), alinearlo a rect.left lo saca de la pantalla.
    const MENU_WIDTH = 256;
    const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
    setPosition({ top: rect.bottom + 6, left: Math.max(8, left) });
    setOpen(true);
    setQuery("");
    if (!folders) {
      const list = await api.mail.folders(accountId);
      setFolders(list);
    }
  }

  const filteredFolders = folders?.filter((f) =>
    folderDisplayName(f, t).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <button
        onClick={handleOpen}
        title={t("list.moveTo")}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover sm:h-9 sm:w-9"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
        </svg>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div
                className="fixed z-50 flex max-h-80 w-64 flex-col rounded-xl border border-border bg-surface shadow-xl"
                style={{ top: position.top, left: position.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="border-b border-border p-1.5">
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("searchable.search")}
                    className="input h-8 w-full text-sm"
                  />
                </div>
                <div className="overflow-y-auto p-1.5">
                  {!folders ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">…</p>
                  ) : filteredFolders?.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("searchable.noResults")}</p>
                  ) : (
                    filteredFolders?.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          onMove(folder.id);
                          setOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-hover"
                      >
                        <FolderIcon specialUse={folder.specialUse} />
                        <span className="truncate">{folderDisplayName(folder, t)}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
