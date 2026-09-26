"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export const FOLDER_COLORS = [
  "#d93025",
  "#e37400",
  "#f2a600",
  "#16a765",
  "#42a5f5",
  "#1a73e8",
  "#7b1fa2",
  "#8e63ce",
  "#616161",
];

export function FolderColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 6, left: rect.left });
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-border"
        style={{ backgroundColor: value ?? "transparent" }}
        title="Color"
      />
      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div
                className="fixed z-50 w-48 rounded-xl border border-border bg-surface p-3 shadow-xl"
                style={{ top: position.top, left: position.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-2 text-xs font-medium text-muted-foreground">Color de carpeta</p>
                <div className="grid grid-cols-5 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                    className="h-6 w-6 rounded-full border-2 border-dashed border-muted-foreground"
                    title="Sin color"
                  />
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        onChange(color);
                        setOpen(false);
                      }}
                      className={`h-6 w-6 rounded-full ${value === color ? "ring-2 ring-offset-2 ring-offset-surface" : ""}`}
                      style={{ backgroundColor: color, ["--tw-ring-color" as string]: color }}
                    />
                  ))}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
