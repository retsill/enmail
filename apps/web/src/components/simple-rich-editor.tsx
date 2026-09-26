"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/context";

export interface SimpleEditorInstance {
  getHTML: () => string;
  setHTML: (html: string) => void;
  insertText: (text: string) => void;
  insertImage: (dataUrl: string) => void;
  focus: () => void;
}

// Sanitiza HTML pegado desde afuera (Word, otro correo, una página web):
// tira <script>/<style>/iframes y cualquier atributo "on*" o "style" con
// javascript:, y deja solo etiquetas de texto/formato razonables. Sin esto,
// pegar contenido ajeno sería un vector de XSS directo sobre contentEditable.
const ALLOWED_TAGS = new Set([
  "P", "BR", "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "A", "UL", "OL", "LI",
  "BLOCKQUOTE", "DIV", "SPAN", "IMG", "H1", "H2", "H3", "TABLE", "TR", "TD", "TH",
  "TBODY", "THEAD", "FONT",
]);
const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ["href", "target", "rel"],
  IMG: ["src", "alt", "width", "height"],
  SPAN: ["style"],
  DIV: ["style"],
  P: ["style"],
  FONT: ["color", "size", "face"],
};

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode(true);
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  if (!ALLOWED_TAGS.has(el.tagName)) {
    // No es una etiqueta permitida: igual conservamos su texto/hijos "planos".
    const frag = document.createDocumentFragment();
    el.childNodes.forEach((child) => {
      const cleaned = sanitizeNode(child);
      if (cleaned) frag.appendChild(cleaned);
    });
    return frag;
  }
  const clean = document.createElement(el.tagName);
  const allowed = ALLOWED_ATTRS[el.tagName] ?? [];
  for (const attr of allowed) {
    const value = el.getAttribute(attr);
    if (!value) continue;
    if (/javascript:/i.test(value)) continue;
    if (attr === "style") {
      // Solo estilos inofensivos de formato de texto, nada de position/url().
      const safeStyle = value
        .split(";")
        .filter((rule) =>
          /^(color|background-color|font-weight|font-style|text-decoration|font-size|font-family|text-align)\s*:/i.test(
            rule.trim(),
          ),
        )
        .join(";");
      if (safeStyle) clean.setAttribute("style", safeStyle);
      continue;
    }
    clean.setAttribute(attr, value);
  }
  el.childNodes.forEach((child) => {
    const cleaned = sanitizeNode(child);
    if (cleaned) clean.appendChild(cleaned);
  });
  return clean;
}

function sanitizeHtml(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  const frag = document.createDocumentFragment();
  template.content.childNodes.forEach((child) => {
    const cleaned = sanitizeNode(child);
    if (cleaned) frag.appendChild(cleaned);
  });
  const holder = document.createElement("div");
  holder.appendChild(frag);
  return holder.innerHTML;
}

const FONT_FAMILIES = [
  { label: "Sans Serif", value: "arial, sans-serif" },
  { label: "Serif", value: "times new roman, serif" },
  { label: "Ancho fijo", value: "courier new, monospace" },
  { label: "Wide", value: "arial black, sans-serif" },
  { label: "Narrow", value: "arial narrow, sans-serif" },
  { label: "Comic Sans MS", value: "comic sans ms, cursive" },
  { label: "Garamond", value: "garamond, serif" },
  { label: "Georgia", value: "georgia, serif" },
  { label: "Tahoma", value: "tahoma, sans-serif" },
  { label: "Trebuchet MS", value: "trebuchet ms, sans-serif" },
  { label: "Verdana", value: "verdana, sans-serif" },
];

const FONT_SIZES = [
  { key: "small", value: "2", textClass: "text-xs" },
  { key: "normal", value: "3", textClass: "text-sm" },
  { key: "large", value: "5", textClass: "text-base" },
  { key: "huge", value: "7", textClass: "text-lg" },
];

const TEXT_COLORS = [
  "#1f1f1f", "#d93025", "#e37400", "#f1c232", "#188038", "#1a73e8", "#9334e6", "#5f6368",
  "#efefef", "#f4cccc", "#fce5cd", "#fff2cc", "#d9ead3", "#c9daf8", "#d9d2e9", "#ffffff",
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ToolbarButton({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      // onMouseDown + preventDefault: si no, el click le roba el foco al
      // editor y se pierde la selección de texto ANTES de poder aplicarle
      // el formato.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-7 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover ${
        active ? "bg-accent-soft text-accent" : "text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

const ALIGN_OPTIONS = [
  { key: "left", command: "justifyLeft", icon: <path d="M4 6h16M4 12h10M4 18h16" /> },
  { key: "center", command: "justifyCenter", icon: <path d="M6 12h12M4 6h16M4 18h16" /> },
  { key: "right", command: "justifyRight", icon: <path d="M10 12h10M4 6h16M4 18h16" /> },
] as const;

type MenuKey = "font" | "size" | "color" | "align" | "link";

export function SimpleRichEditor({
  value,
  onChange,
  minHeight = 180,
  onReady,
  bordered = true,
}: {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  onReady?: (instance: SimpleEditorInstance) => void;
  bordered?: boolean;
}) {
  const { t } = useLocale();
  const editableRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [align, setAlign] = useState<(typeof ALIGN_OPTIONS)[number]["key"]>("left");
  const [linkUrl, setLinkUrl] = useState("");
  // Un solo menú abierto a la vez, y se cierra con un listener global de
  // mousedown (no con un overlay invisible de pantalla completa) — ese
  // overlay podía quedar "pegado" bloqueando toda la página, incluido el
  // cierre del modal, si algo interrumpía su ciclo de abrir/cerrar.
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const savedRangeRef = useRef<Range | null>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  // El contenido inicial se pone UNA sola vez: si sincronizáramos
  // innerHTML en cada `value` que cambia, el cursor saltaría al principio
  // en cada tecla (el eterno problema de contentEditable + React).
  useEffect(() => {
    if (editableRef.current) editableRef.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!onReady) return;
    onReady({
      getHTML: () => editableRef.current?.innerHTML ?? "",
      setHTML: (nextHtml: string) => {
        if (editableRef.current) editableRef.current.innerHTML = nextHtml;
        onChange(nextHtml);
      },
      insertText: (text: string) => {
        editableRef.current?.focus();
        restoreSelection();
        document.execCommand("insertText", false, text);
        emitChange();
      },
      insertImage: (dataUrl: string) => {
        editableRef.current?.focus();
        restoreSelection();
        document.execCommand("insertImage", false, dataUrl);
        emitChange();
      },
      focus: () => editableRef.current?.focus(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emitChange() {
    onChange(editableRef.current?.innerHTML ?? "");
  }

  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editableRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }

  function updateActiveStates() {
    try {
      setActiveStates({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
      if (document.queryCommandState("justifyCenter")) setAlign("center");
      else if (document.queryCommandState("justifyRight")) setAlign("right");
      else setAlign("left");
    } catch {
      // algunos navegadores tiran si se consulta fuera de foco — se ignora
    }
    saveSelection();
  }

  function exec(command: string, value?: string) {
    editableRef.current?.focus();
    document.execCommand(command, false, value);
    updateActiveStates();
    emitChange();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (html) {
      document.execCommand("insertHTML", false, sanitizeHtml(html));
    } else {
      document.execCommand("insertText", false, text);
    }
    emitChange();
  }

  function toggleMenu(key: MenuKey) {
    setOpenMenu((current) => (current === key ? null : key));
  }

  function openLinkPopover() {
    saveSelection();
    setLinkUrl("");
    toggleMenu("link");
  }

  function insertImageFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      editableRef.current?.focus();
      restoreSelection();
      document.execCommand("insertImage", false, reader.result);
      emitChange();
    };
    reader.readAsDataURL(file);
  }

  function applyLink() {
    if (!linkUrl.trim()) {
      setOpenMenu(null);
      return;
    }
    editableRef.current?.focus();
    restoreSelection();
    const url = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
    document.execCommand("createLink", false, url);
    setOpenMenu(null);
    emitChange();
  }

  const activeAlign = ALIGN_OPTIONS.find((a) => a.key === align) ?? ALIGN_OPTIONS[0];

  return (
    <div
      className={`rich-text-editor flex flex-1 min-h-0 flex-col rounded-lg ${bordered ? "border border-border" : ""}`}
    >
      <div
        ref={editableRef}
        contentEditable
        onInput={emitChange}
        onPaste={handlePaste}
        onMouseUp={updateActiveStates}
        onKeyUp={updateActiveStates}
        onFocus={updateActiveStates}
        style={{ minHeight }}
        className="flex-1 overflow-y-auto px-3 py-2 text-sm leading-relaxed outline-none [&_a]:text-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />

      <div
        ref={toolbarRef}
        className="relative m-2 flex shrink-0 flex-wrap items-center gap-px rounded-2xl border border-[var(--editor-toolbar-border)] bg-[var(--editor-toolbar-bg)] px-1.5 py-1 shadow-sm"
      >
        <div className="relative">
          <button
            type="button"
            title={t("editor.fontFamily")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggleMenu("font")}
            className="flex h-8 items-center gap-1 rounded-full px-2 text-xs hover:bg-surface-hover"
          >
            {t("editor.fontFamily")}
            <ChevronDown />
          </button>
          {openMenu === "font" ? (
            <div className="absolute top-full mt-1 left-0 z-50 max-h-72 w-48 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {FONT_FAMILIES.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec("fontName", f.value);
                    setOpenMenu(null);
                  }}
                  style={{ fontFamily: f.value }}
                  className="block w-full px-3 py-1.5 text-left text-sm hover:bg-surface-hover"
                >
                  {f.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            title={t("editor.fontSize")}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => toggleMenu("size")}
            className="flex h-8 items-center gap-1 rounded-full px-2 text-xs hover:bg-surface-hover"
          >
            <Icon><path d="M4 7V5h12v2" /><path d="M10 5v14M8 19h4" /><path d="M17 12v-1h5v1M19.5 11v8M18.5 19h2" /></Icon>
            <ChevronDown />
          </button>
          {openMenu === "size" ? (
            <div className="absolute top-full mt-1 left-0 z-50 w-36 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
              {FONT_SIZES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec("fontSize", s.value);
                    setOpenMenu(null);
                  }}
                  className={`block w-full px-3 py-1.5 text-left hover:bg-surface-hover ${s.textClass}`}
                >
                  {t(`editor.size.${s.key}` as never)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <span className="mx-0.5 h-5 w-px bg-[var(--editor-toolbar-divider)]" />

        <ToolbarButton active={activeStates.bold} title={t("editor.bold")} onClick={() => exec("bold")}>
          <Icon><path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" /></Icon>
        </ToolbarButton>
        <ToolbarButton active={activeStates.italic} title={t("editor.italic")} onClick={() => exec("italic")}>
          <Icon><path d="M19 4h-9M14 20H5M15 4 9 20" /></Icon>
        </ToolbarButton>
        <ToolbarButton active={activeStates.underline} title={t("editor.underline")} onClick={() => exec("underline")}>
          <Icon><path d="M6 4v6a6 6 0 0 0 12 0V4" /><path d="M4 20h16" /></Icon>
        </ToolbarButton>
        <ToolbarButton active={activeStates.strikeThrough} title={t("editor.strike")} onClick={() => exec("strikeThrough")}>
          <Icon><path d="M6 12h12" /><path d="M16 6.5c-.5-1.2-2-2-4-2-2.5 0-4.5 1-4.5 2.8 0 1.2.8 1.9 2 2.3" /><path d="M8 17.5c.5 1.2 2 2 4 2 2.5 0 4.5-1 4.5-2.8 0-1.3-1-2-2.5-2.4" /></Icon>
        </ToolbarButton>

        <div className="relative">
          <ToolbarButton title={t("editor.textColor")} onClick={() => toggleMenu("color")}>
            <span className="flex flex-col items-center leading-none">
              <span className="text-[11px] font-bold">A</span>
              <span className="mt-0.5 h-1 w-3.5 rounded-sm bg-danger" />
            </span>
          </ToolbarButton>
          {openMenu === "color" ? (
            <div className="absolute top-full mt-1 left-0 z-50 grid grid-cols-8 gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec("foreColor", color);
                    setOpenMenu(null);
                  }}
                  style={{ backgroundColor: color }}
                  className="h-5 w-5 rounded-full border border-border"
                />
              ))}
            </div>
          ) : null}
        </div>

        <span className="mx-0.5 h-5 w-px bg-[var(--editor-toolbar-divider)]" />

        <div className="relative">
          <ToolbarButton title={t(`editor.align.${activeAlign.key}` as never)} onClick={() => toggleMenu("align")}>
            <Icon>{activeAlign.icon}</Icon>
          </ToolbarButton>
          {openMenu === "align" ? (
            <div className="absolute top-full mt-1 left-0 z-50 flex flex-col gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-lg">
              {ALIGN_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  title={t(`editor.align.${opt.key}` as never)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec(opt.command);
                    setOpenMenu(null);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded hover:bg-surface-hover ${
                    align === opt.key ? "bg-accent-soft text-accent" : ""
                  }`}
                >
                  <Icon>{opt.icon}</Icon>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <ToolbarButton active={activeStates.insertUnorderedList} title={t("editor.bulletedList")} onClick={() => exec("insertUnorderedList")}>
          <Icon><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /><path d="M9 6h11M9 12h11M9 18h11" /></Icon>
        </ToolbarButton>
        <ToolbarButton active={activeStates.insertOrderedList} title={t("editor.numberedList")} onClick={() => exec("insertOrderedList")}>
          <Icon><path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h1M4 10v-4l-1 1M4 14h1.5a1 1 0 0 1 0 2H4h1.5a1 1 0 0 1 0 2H4" /></Icon>
        </ToolbarButton>
        <ToolbarButton title={t("editor.outdent")} onClick={() => exec("outdent")}>
          <Icon><path d="M11 6h9M11 12h9M11 18h9M7 8 3 12l4 4" /></Icon>
        </ToolbarButton>
        <ToolbarButton title={t("editor.indent")} onClick={() => exec("indent")}>
          <Icon><path d="M11 6h9M11 12h9M11 18h9M3 8l4 4-4 4" /></Icon>
        </ToolbarButton>

        <span className="mx-0.5 h-5 w-px bg-[var(--editor-toolbar-divider)]" />

        <div className="relative">
          <ToolbarButton title={t("editor.link")} onClick={openLinkPopover}>
            <Icon><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></Icon>
          </ToolbarButton>
          {openMenu === "link" ? (
            <div className="absolute top-full mt-1 left-0 z-50 flex w-64 items-center gap-1 rounded-lg border border-border bg-surface p-2 shadow-lg">
              <input
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyLink()}
                placeholder="https://…"
                className="input h-8 flex-1 text-xs"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={applyLink}
                className="rounded-full bg-accent px-3 py-1.5 text-xs text-accent-foreground"
              >
                {t("editor.linkApply")}
              </button>
            </div>
          ) : null}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            insertImageFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <ToolbarButton
          title={t("editor.insertImage")}
          onClick={() => {
            saveSelection();
            imageInputRef.current?.click();
          }}
        >
          <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></Icon>
        </ToolbarButton>
        <ToolbarButton title={t("editor.blockquote")} onClick={() => exec("formatBlock", "blockquote")}>
          <Icon><path d="M7 8c-2 0-3 1.5-3 3.5S5 15 7 15" /><path d="M17 8c-2 0-3 1.5-3 3.5S15 15 17 15" /></Icon>
        </ToolbarButton>
        <ToolbarButton title={t("editor.removeFormat")} onClick={() => exec("removeFormat")}>
          <Icon><path d="M4 4l16 16" /><path d="M14 4H8L4 12h6M10 12l4 8h-4" /></Icon>
        </ToolbarButton>
      </div>
    </div>
  );
}
