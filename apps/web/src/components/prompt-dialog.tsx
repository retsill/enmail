"use client";

import { useState, type FormEvent } from "react";
import { useLocale } from "@/i18n/context";

export function PromptDialog({
  title,
  label,
  initialValue,
  onSubmit,
  onCancel,
}: {
  title: string;
  label: string;
  initialValue: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  }

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl"
      >
        <h2 className="mb-4 text-base font-semibold">{title}</h2>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">{label}</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input"
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
          >
            {t("addAccount.cancel")}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            {t("addAccount.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
