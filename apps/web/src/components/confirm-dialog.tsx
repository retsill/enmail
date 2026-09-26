"use client";

import { useLocale } from "@/i18n/context";

export function ConfirmDialog({
  title,
  message,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="mb-2 text-base font-semibold">{title}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
          >
            {t("addAccount.cancel")}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90 ${
              danger ? "bg-danger" : "bg-accent"
            }`}
          >
            {t("list.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
