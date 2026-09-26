"use client";

import { useState } from "react";
import { useLocale } from "@/i18n/context";

export type SelectAllMode = "all" | "none" | "read" | "unread" | "flagged" | "unflagged";

export function SelectAllMenu({
  checked,
  indeterminate,
  onSelect,
}: {
  checked: boolean;
  indeterminate: boolean;
  onSelect: (mode: SelectAllMode) => void;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const options: { mode: SelectAllMode; label: string }[] = [
    { mode: "all", label: t("selectAll.all") },
    { mode: "none", label: t("selectAll.none") },
    { mode: "read", label: t("selectAll.read") },
    { mode: "unread", label: t("selectAll.unread") },
    { mode: "flagged", label: t("selectAll.flagged") },
    { mode: "unflagged", label: t("selectAll.unflagged") },
  ];

  return (
    <div className="relative flex items-center">
      <span
        onClick={() => onSelect(checked ? "none" : "all")}
        className={`h-4 w-4 shrink-0 cursor-pointer rounded-sm border ${
          checked ? "border-accent bg-accent" : indeterminate ? "border-accent bg-accent-soft" : "border-muted-foreground"
        }`}
      />
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-40 w-40 rounded-xl border border-border bg-surface p-1 shadow-lg">
            {options.map((opt) => (
              <button
                key={opt.mode}
                onClick={() => {
                  onSelect(opt.mode);
                  setOpen(false);
                }}
                className="flex w-full items-center rounded-lg px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
