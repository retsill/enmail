"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError, type MailAccount } from "@/lib/api";
import { useLocale } from "@/i18n/context";
import { SearchableSelect } from "@/components/searchable-select";
import { EmojiPicker } from "@/components/emoji-picker";
import { RecipientsInput } from "@/components/recipients-input";
import { SimpleRichEditor, type SimpleEditorInstance } from "@/components/simple-rich-editor";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface ComposeInitial {
  to?: string;
  subject?: string;
  html?: string;
  inReplyTo?: string;
}

// Anchos usados para acomodar varias ventanas de "popup" lado a lado (deben
// coincidir con las clases w-[640px]/w-72 de panelClass más abajo).
export const COMPOSE_POPUP_WIDTH = 640;
export const COMPOSE_POPUP_MINIMIZED_WIDTH = 288;

function HeaderIconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
    >
      {children}
    </button>
  );
}

export function ComposeDialog({
  accounts,
  defaultAccountId,
  variant = "popup",
  initial,
  onClose,
  onSent,
  minimized: minimizedProp,
  onMinimizedChange,
  dockOffset = 0,
  dockBottom = 0,
}: {
  accounts: MailAccount[];
  defaultAccountId: string;
  variant?: "popup" | "inline" | "thread";
  initial?: ComposeInitial;
  onClose: () => void;
  onSent: () => void;
  // Para permitir varias ventanas de "popup" a la vez (estilo Gmail): el
  // padre decide si esta arranca minimizada y se entera cuando cambia, para
  // poder recalcular cuántas hay abiertas de lleno y dónde acomodar cada una.
  minimized?: boolean;
  onMinimizedChange?: (minimized: boolean) => void;
  dockOffset?: number;
  // Desplazamiento vertical (px) desde el borde inferior — las minimizadas
  // se apilan hacia arriba en vez de hacia el costado, para no perderse de
  // vista cuando hay varias a la vez.
  dockBottom?: number;
}) {
  const { t } = useLocale();
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [to, setTo] = useState<string[]>(initial?.to ? [initial.to] : []);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const signature = accounts.find((a) => a.id === defaultAccountId)?.signature;
  const [html, setHtml] = useState(
    initial?.html ? initial.html : signature ? `<p></p>${signature}` : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [internalMinimized, setInternalMinimized] = useState(minimizedProp ?? false);
  const minimized = minimizedProp ?? internalMinimized;
  function setMinimized(next: boolean | ((prev: boolean) => boolean)) {
    const value = typeof next === "function" ? next(minimized) : next;
    if (onMinimizedChange) onMinimizedChange(value);
    else setInternalMinimized(value);
  }
  const [maximized, setMaximized] = useState(false);
  const editorRef = useRef<SimpleEditorInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Firma actualmente insertada en el cuerpo, para poder reemplazarla si el
  // usuario cambia la cuenta de envío (y no tocarla si el usuario la borró
  // o la editó a mano — en ese caso ya no aparece tal cual en el HTML).
  const insertedSignatureRef = useRef(signature ?? "");
  const mountedRef = useRef(false);
  // Contenido con el que arrancó la ventana (firma incluida, o la cita de
  // una respuesta/reenvío) — si al cerrar nada cambió respecto a esto, no
  // hay nada real que guardar como borrador.
  const initialHtmlRef = useRef(html);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const nextSignature = accounts.find((a) => a.id === accountId)?.signature ?? "";
    const editor = editorRef.current;
    if (!editor) {
      insertedSignatureRef.current = nextSignature;
      return;
    }
    const current = editor.getHTML();
    const prevSignature = insertedSignatureRef.current;
    let updated = current;
    if (prevSignature && current.includes(prevSignature)) {
      updated = current.replace(prevSignature, nextSignature);
    } else if (nextSignature && !current.includes(nextSignature)) {
      updated = `${current}${nextSignature}`;
    }
    if (updated !== current) {
      editor.setHTML(updated);
      setHtml(updated);
    }
    insertedSignatureRef.current = nextSignature;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleEmoji(emoji: string) {
    editorRef.current?.insertText(emoji);
  }

  // Cerrar sin enviar: si el usuario escribió algo real (destinatario,
  // asunto, o tocó el cuerpo respecto a como arrancó), se guarda como
  // borrador en la carpeta Drafts de la cuenta antes de cerrar — igual que
  // cualquier cliente de correo real al descartar un mensaje a medias.
  async function handleDiscardClose() {
    const currentHtml = editorRef.current?.getHTML() ?? html;
    const hasContent =
      to.length > 0 ||
      cc.length > 0 ||
      bcc.length > 0 ||
      subject.trim().length > 0 ||
      currentHtml !== initialHtmlRef.current;
    if (hasContent) {
      try {
        await api.mail.saveDraft(accountId, {
          to: to.length ? to : undefined,
          cc: cc.length ? cc : undefined,
          bcc: bcc.length ? bcc : undefined,
          subject: subject || undefined,
          html: currentHtml || undefined,
        });
      } catch {
        // Si falla guardar el borrador no bloqueamos el cierre — el
        // usuario ya decidió descartar la ventana.
      }
    }
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.mail.send(accountId, {
        to,
        cc: cc.length ? cc : undefined,
        bcc: bcc.length ? bcc : undefined,
        subject,
        html,
        inReplyTo: initial?.inReplyTo,
        references: initial?.inReplyTo,
        attachments,
      });
      onSent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("login.error.generic"));
    } finally {
      setSending(false);
    }
  }

  const isInline = variant === "inline";
  const isThread = variant === "thread";
  const isPopup = variant === "popup";
  const isMinimized = isPopup && minimized;
  const isMaximized = isPopup && maximized;

  const wrapperClass = isInline
    ? "flex h-full w-full flex-col"
    : isThread
      ? "flex w-full flex-col"
      : isMaximized
        ? "modal-backdrop fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4 sm:p-8"
        // Separado del borde/footer (no pegado abajo) para que se vea
        // flotando, como en Gmail — por eso las 4 esquinas van redondeadas.
        // pointer-events-none: esta franja es fixed inset-x-0 (todo el
        // ancho de la pantalla) para poder alinear el panel a la derecha,
        // pero sin esto bloqueaba los clics en el sidebar/lista de correo
        // que quedan detrás, aunque ahí no se viera nada del panel.
        : "modal-backdrop pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-end px-4 pb-6 sm:px-8";

  const panelClass = isInline
    ? "flex h-full w-full flex-col"
    : isThread
      ? "flex w-full flex-col rounded-xl border border-border bg-surface"
      : isMaximized
        ? "flex h-full w-full max-w-3xl flex-col rounded-xl border border-border bg-surface shadow-2xl"
        : isMinimized
          // Minimizada: solo la barra de título, sin el alto fijo de la
          // ventana completa — así varias minimizadas ocupan poco espacio.
          ? "pointer-events-auto flex w-72 flex-col rounded-t-xl border border-border bg-surface shadow-2xl"
          : "pointer-events-auto flex h-[70vh] max-h-[85vh] w-[640px] flex-col rounded-xl border border-border bg-surface shadow-2xl";

  return (
    <div
      className={wrapperClass}
      style={isPopup && !isMaximized && dockBottom ? { bottom: dockBottom } : undefined}
    >
      <div
        className={panelClass}
        // Corre esta ventana hacia la izquierda según cuántas otras ya
        // ocupan lugar más cerca del borde derecho — así se pueden ver
        // varias a la vez, una al lado de la otra, como en Gmail.
        style={isPopup && !isMaximized && dockOffset ? { marginRight: dockOffset } : undefined}
      >
        {isInline ? (
          <button
            onClick={handleDiscardClose}
            className="mb-4 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        ) : isPopup ? (
          <div
            onClick={() => isMinimized && setMinimized(false)}
            className={`flex items-center justify-between rounded-t-xl bg-surface-muted px-4 py-2.5 ${isMinimized ? "cursor-pointer" : ""}`}
          >
            <span className="truncate text-sm font-medium">{subject || t("sidebar.compose")}</span>
            <div className="flex shrink-0 items-center gap-0.5">
              <HeaderIconButton
                title={isMinimized ? t("compose.restore") : t("compose.minimize")}
                onClick={(e) => {
                  e.stopPropagation();
                  setMinimized((v) => !v);
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14" strokeLinecap="round" />
                </svg>
              </HeaderIconButton>
              <HeaderIconButton
                title={isMaximized ? t("compose.restore") : t("compose.maximize")}
                onClick={(e) => {
                  e.stopPropagation();
                  setMaximized((v) => !v);
                  setMinimized(false);
                }}
              >
                {isMaximized ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 4v4a1 1 0 0 1-1 1H4M15 20v-4a1 1 0 0 1 1-1h4M20 9h-4a1 1 0 0 1-1-1V4M4 15h4a1 1 0 0 1 1 1v4" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                  </svg>
                )}
              </HeaderIconButton>
              <HeaderIconButton
                title={t("addAccount.cancel")}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDiscardClose();
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </HeaderIconButton>
            </div>
          </div>
        ) : null}

        {!isMinimized ? (
          <form
            onSubmit={handleSubmit}
            className={`flex min-h-0 flex-1 flex-col ${isInline ? "overflow-y-auto rounded-xl border border-border" : ""}`}
          >
            {accounts.length > 1 ? (
              <div className="border-b border-border px-4 py-2">
                <SearchableSelect
                  value={accountId}
                  onChange={setAccountId}
                  options={accounts.map((acc) => ({ value: acc.id, label: acc.emailAddress }))}
                  className="border-none px-0 py-0"
                />
              </div>
            ) : null}
            <RecipientsInput
              value={to}
              onChange={setTo}
              placeholder={t("compose.to")}
              trailing={
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {!showCc ? (
                    <button type="button" onClick={() => setShowCc(true)} className="hover:text-accent">
                      {t("compose.cc")}
                    </button>
                  ) : null}
                  {!showBcc ? (
                    <button type="button" onClick={() => setShowBcc(true)} className="hover:text-accent">
                      {t("compose.bcc")}
                    </button>
                  ) : null}
                </div>
              }
            />
            {showCc ? <RecipientsInput value={cc} onChange={setCc} placeholder={t("compose.cc")} /> : null}
            {showBcc ? <RecipientsInput value={bcc} onChange={setBcc} placeholder={t("compose.bcc")} /> : null}
            {!isThread ? (
              <input
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t("compose.subject")}
                className="border-b border-border px-4 py-2.5 text-sm outline-none"
              />
            ) : null}
            <div className={`flex min-h-0 flex-col px-4 py-3 ${isThread ? "" : "flex-1"}`}>
              <SimpleRichEditor
                value={html}
                onChange={setHtml}
                minHeight={isMaximized ? 320 : isInline ? 320 : isThread ? 120 : 260}
                bordered={false}
                onReady={(editor) => {
                  editorRef.current = editor;
                }}
              />
            </div>

            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2">
                {attachments.map((file, i) => (
                  <span
                    key={`${file.name}-${i}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-surface-muted py-1 pl-3 pr-1 text-xs"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted-foreground">
                      <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span className="max-w-40 truncate">{file.name}</span>
                    <span className="shrink-0 text-muted-foreground">{formatFileSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover"
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            {error ? <p className="px-4 pb-2 text-sm text-danger">{error}</p> : null}

            <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
              <div className="flex items-center gap-1">
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-60"
                >
                  {sending ? "…" : t("compose.send")}
                </button>

                <span className="mx-1 h-6 w-px bg-border" />

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title={t("compose.attach")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                <EmojiPicker onSelect={handleEmoji} />
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDiscardClose}
                  title={t("compose.discard")}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                  </svg>
                </button>
                {isThread ? (
                  <button
                    type="button"
                    onClick={handleDiscardClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
                    title={t("addAccount.cancel")}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                ) : null}
              </div>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
