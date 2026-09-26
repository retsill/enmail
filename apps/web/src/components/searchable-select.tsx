"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "@/i18n/context";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

// Select con buscador (equivalente a select2) para listas largas — cuentas,
// carpetas, idiomas, etc. Se usa en vez de un <select> nativo en todo el
// proyecto para que se pueda filtrar escribiendo.
export function SearchableSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  function handleOpen() {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setQuery("");
    setOpen(true);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className={`input flex items-center justify-between gap-2 text-left ${className ?? ""}`}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted-foreground">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div
                className="fixed z-50 flex max-h-72 flex-col rounded-xl border border-border bg-surface shadow-xl"
                style={{ top: position.top, left: position.left, minWidth: position.width }}
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
                  {filtered.length === 0 ? (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("searchable.noResults")}</p>
                  ) : (
                    filtered.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-hover ${
                          opt.value === value ? "bg-accent-soft text-accent" : ""
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
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
