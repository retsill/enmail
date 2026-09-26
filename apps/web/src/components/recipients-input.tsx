"use client";

import { useEffect, useRef, useState } from "react";
import { api, type Contact } from "@/lib/api";

// Campo de destinatarios estilo Gmail: cada dirección queda como una
// "etiqueta" removible (no texto separado por comas). Al escribir sugiere
// contactos guardados; un clic (o Enter/coma/Tab) la agrega como etiqueta.
// `trailing` permite meter contenido extra a la derecha de la misma fila
// (los botones "Cc"/"Cco" en el campo "Para").
export function RecipientsInput({
  value,
  onChange,
  placeholder,
  trailing,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  trailing?: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = draft.trim();
    if (!query) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const id = setTimeout(() => {
      api.contacts
        .list(query)
        .then((list) => {
          const filtered = list.filter((c) => !value.includes(c.email));
          setSuggestions(filtered);
          setOpen(filtered.length > 0);
          setHighlighted(0);
        })
        .catch(() => undefined);
    }, 150);
    return () => clearTimeout(id);
  }, [draft, value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function addRecipient(email: string) {
    const trimmed = email.trim().replace(/,$/, "");
    if (!trimmed) {
      setDraft("");
      return;
    }
    if (!value.includes(trimmed)) onChange([...value, trimmed]);
    setDraft("");
    setOpen(false);
  }

  function removeRecipient(email: string) {
    onChange(value.filter((v) => v !== email));
  }

  return (
    <div ref={containerRef} className="relative border-b border-border">
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-1.5">
        {value.map((email) => (
          <span
            key={email}
            className="flex items-center gap-1 rounded-full bg-surface-muted py-1 pl-3 pr-1 text-xs"
          >
            {email}
            <button
              type="button"
              onClick={() => removeRecipient(email)}
              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-surface-hover"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (open && suggestions.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              setHighlighted((h) =>
                e.key === "ArrowDown"
                  ? (h + 1) % suggestions.length
                  : (h - 1 + suggestions.length) % suggestions.length,
              );
              return;
            }
            if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              if (!draft.trim()) return;
              e.preventDefault();
              if (open && suggestions[highlighted]) addRecipient(suggestions[highlighted].email);
              else addRecipient(draft);
              return;
            }
            if (e.key === "Backspace" && !draft && value.length > 0) {
              removeRecipient(value[value.length - 1]);
            }
          }}
          onBlur={() => draft.trim() && addRecipient(draft)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none"
        />
        {trailing ? <div className="ml-auto flex shrink-0 items-center">{trailing}</div> : null}
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-20 max-h-56 overflow-y-auto rounded-b-lg border border-t-0 border-border bg-surface shadow-lg">
          {suggestions.map((contact, i) => (
            <button
              key={contact.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addRecipient(contact.email)}
              className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm ${
                i === highlighted ? "bg-accent-soft" : "hover:bg-surface-hover"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-medium text-accent">
                {(contact.name || contact.email).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {contact.name ? <span className="font-medium">{contact.name} </span> : null}
                <span className="text-muted-foreground">{contact.email}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
