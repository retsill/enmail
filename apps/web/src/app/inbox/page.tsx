"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  api,
  ApiError,
  type Addon,
  type MailAccount,
  type MailAttachment,
  type MailFolder,
  type MailMessage,
  type UnifiedMessage,
} from "@/lib/api";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { EditAccountDialog } from "@/components/edit-account-dialog";
import {
  ComposeDialog,
  type ComposeInitial,
  COMPOSE_POPUP_WIDTH,
  COMPOSE_POPUP_MINIMIZED_WIDTH,
} from "@/components/compose-dialog";
import { MoveToMenu } from "@/components/move-to-menu";
import { SelectAllMenu } from "@/components/select-all-menu";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PromptDialog } from "@/components/prompt-dialog";
import { ProgressDialog } from "@/components/progress-dialog";
import { EmailBody } from "@/components/email-body";
import { FolderIcon } from "@/components/folder-icon";
import { FolderColorPicker } from "@/components/folder-color-picker";
import { folderDisplayName } from "@/lib/folder-display";
import { formatMessageDate } from "@/lib/format-date";
import { useLocale } from "@/i18n/context";
import { AppRail, MobileAppSwitcher } from "@/components/app-rail";
import { ContactsApp } from "@/components/contacts-app";
import { CategoryIcon } from "@/components/category-icon";
import { useInboxSearch } from "./search-context";
import { useInboxView } from "./view-context";
import { useIsMobile } from "@/lib/use-is-mobile";

const UNIFIED = "__unified__";
const STARRED = "__starred__";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InboxPage() {
  const { t, locale } = useLocale();
  const { search } = useInboxSearch();
  const {
    columns,
    composeStyle,
    pageSize,
    density,
    enabledCategories,
    activeApp,
    sidebarCollapsed,
    toggleSidebar,
    closeSidebar,
  } = useInboxView();
  const isMobile = useIsMobile();
  // En el celular, 2/3/4 columnas lado a lado no entran — siempre se
  // comporta como "lista o lectura, una a la vez" (igual que Gmail mobile),
  // sin pisar la preferencia de columnas que el usuario eligió para desktop.
  const effectiveColumns = isMobile ? 2 : columns;
  // sidebarCollapsed arranca en false porque en desktop es una columna fija
  // (mostrarla no tapa nada) — pero en mobile pasa a ser un drawer que flota
  // ENCIMA de todo, así que si no se cierra acá el usuario abriría la app y
  // vería el menú tapando la bandeja en vez de sus correos.
  useEffect(() => {
    if (isMobile) closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  // Conteo por categoría de TODA la carpeta/bandeja (lo calcula el
  // servidor), no solo de la página actualmente cargada — si no, las
  // pestañas dependían de qué 25-50 mensajes tocara cargar y desaparecían
  // apenas esa página resultaba tener una sola categoría.
  const [serverCategoryCounts, setServerCategoryCounts] = useState<Record<string, number>>({});
  // El número que se muestra en cada pestaña es de no leídos (nuevos), no
  // el total — se mantiene aparte de serverCategoryCounts (que sigue
  // siendo "todos", usado para decidir qué pestañas existen).
  const [serverUnreadCategoryCounts, setServerUnreadCategoryCounts] = useState<Record<string, number>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const [oauthNotice, setOauthNotice] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [foldersByAccount, setFoldersByAccount] = useState<Record<string, MailFolder[]>>({});

  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"account" | typeof UNIFIED | typeof STARRED>(UNIFIED);
  const [activeCategory, setActiveCategory] = useState<MailMessage["category"]>("PRIMARY");

  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [unifiedMessages, setUnifiedMessages] = useState<UnifiedMessage[]>([]);
  const [starredMessages, setStarredMessages] = useState<UnifiedMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  // openMessage recibe accountId/folderId como argumentos sueltos (no vienen
  // en el message) — hay que guardarlos para poder pedir los adjuntos más
  // tarde, cuando ya no se tiene ese folderId a mano en el resto del JSX.
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bodyData, setBodyData] = useState<{ text?: string; html?: string; attachments?: MailAttachment[] } | null>(
    null,
  );
  const [bodyError, setBodyError] = useState<string | null>(null);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MailAccount | null>(null);
  const [composeInitial, setComposeInitial] = useState<ComposeInitial | undefined>(undefined);
  const [threadReply, setThreadReply] = useState<ComposeInitial | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  // Varias ventanas de "Redactar" a la vez, estilo Gmail: las dos primeras
  // se abren de tamaño normal, de ahí en más arrancan minimizadas.
  const [composeWindows, setComposeWindows] = useState<
    { id: string; accountId: string; initial?: ComposeInitial; minimized: boolean }[]
  >([]);
  const [newFolderFor, setNewFolderFor] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Ancho de la columna de la lista en modo 3 columnas, ajustable arrastrando
  // el divisor. Se guarda en localStorage: es una preferencia solo de este
  // navegador, no hace falta mandarla al servidor.
  const [listColumnWidth, setListColumnWidth] = useState(460);
  const [resizingColumn, setResizingColumn] = useState(false);

  // Igual que listColumnWidth, pero para la variante "3 columnas, vista
  // abajo": ahí lo que se arrastra es el ALTO de la lista, no el ancho.
  const [listRowHeight, setListRowHeight] = useState(320);
  const [resizingRow, setResizingRow] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("webmail_list_column_width");
      if (stored) setListColumnWidth(Number(stored));
      const storedHeight = window.localStorage.getItem("webmail_list_row_height");
      if (storedHeight) setListRowHeight(Number(storedHeight));
    } catch {
      // no-op
    }
  }, []);

  function startColumnResize(e: React.MouseEvent) {
    e.preventDefault();
    setResizingColumn(true);
    const startX = e.clientX;
    const startWidth = listColumnWidth;

    function onMouseMove(moveEvent: MouseEvent) {
      const next = Math.min(720, Math.max(280, startWidth + (moveEvent.clientX - startX)));
      setListColumnWidth(next);
    }
    function onMouseUp() {
      setResizingColumn(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setListColumnWidth((current) => {
        try {
          window.localStorage.setItem("webmail_list_column_width", String(current));
        } catch {
          // no-op
        }
        return current;
      });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  function startRowResize(e: React.MouseEvent) {
    e.preventDefault();
    setResizingRow(true);
    const startY = e.clientY;
    const startHeight = listRowHeight;

    function onMouseMove(moveEvent: MouseEvent) {
      const next = Math.min(window.innerHeight - 200, Math.max(150, startHeight + (moveEvent.clientY - startY)));
      setListRowHeight(next);
    }
    function onMouseUp() {
      setResizingRow(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setListRowHeight((current) => {
        try {
          window.localStorage.setItem("webmail_list_row_height", String(current));
        } catch {
          // no-op
        }
        return current;
      });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }
  // Ids que acaban de aparecer en la lista tras sincronizar — muestran una
  // insignia "Nuevo" junto al remitente por unos segundos y después se
  // quita sola (no queda guardado en ningún lado, es solo para notar la
  // llegada).
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  function markNewMessages(prevIds: Set<string>, freshItems: { id: string }[] | undefined) {
    if (!freshItems) return;
    const freshIds = freshItems.filter((m) => !prevIds.has(m.id)).map((m) => m.id);
    if (freshIds.length === 0) return;
    setNewMessageIds((prev) => new Set([...prev, ...freshIds]));
    setTimeout(() => {
      setNewMessageIds((prev) => {
        const next = new Set(prev);
        freshIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 10000);
  }
  const [error, setError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);
  const [promptState, setPromptState] = useState<{
    title: string;
    label: string;
    initialValue: string;
    onSubmit: (value: string) => void;
  } | null>(null);
  const [bulkProgress, setBulkProgress] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      const list = await api.mailAccounts.list();
      setAccounts(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  const loadAddons = useCallback(async () => {
    try {
      setAddons(await api.addons.list());
    } catch {
      // no-op: los botones de conectar simplemente no aparecen
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadAddons();
  }, [loadAccounts, loadAddons]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("oauthError");
    if (connected) {
      setOauthNotice(`${connected} conectado ✓`);
      loadAccounts();
      router.replace("/inbox");
    } else if (oauthError) {
      setOauthNotice(`Error: ${oauthError}`);
      router.replace("/inbox");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadFolders = useCallback(async (accountId: string, autoSync = false) => {
    try {
      let list = await api.mail.folders(accountId);
      if (list.length === 0 && autoSync) {
        await api.mail.sync(accountId);
        list = await api.mail.folders(accountId);
      }
      setFoldersByAccount((prev) => ({ ...prev, [accountId]: list }));
      return list;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
      return [];
    }
  }, []);

  // El filtrado por categoría en el servidor puede tardar (hasta varias
  // vueltas de fetch en vivo contra IMAP si la carpeta no tiene suficiente
  // cacheado de esa categoría). Si el usuario cambia de pestaña mientras la
  // petición anterior todavía está en curso, esa petición vieja puede
  // resolver DESPUÉS y pisar el resultado de la nueva — se veía como "los
  // mensajes aparecen y a los pocos segundos desaparecen". Con un id de
  // petición por llamada, se descarta cualquier respuesta que ya no sea la
  // más reciente.
  const messagesRequestIdRef = useRef(0);
  const unifiedRequestIdRef = useRef(0);

  const loadMessages = useCallback(
    async (accountId: string, folderId: string, page = 1, categoryOverride?: string) => {
      const requestId = ++messagesRequestIdRef.current;
      try {
        const folder = (foldersByAccount[accountId] ?? []).find((f) => f.id === folderId);
        const category = folder?.specialUse === "\\Inbox" ? (categoryOverride ?? activeCategory) : undefined;
        const result = await api.mail.messages(accountId, folderId, page, pageSize, category);
        if (requestId !== messagesRequestIdRef.current) return;
        setMessages(result.items);
        setTotalCount(result.total);
        setCurrentPage(result.page);
        setServerCategoryCounts(result.categoryCounts ?? {});
        setServerUnreadCategoryCounts(result.unreadCategoryCounts ?? {});
        return result.items;
      } catch (err) {
        if (requestId !== messagesRequestIdRef.current) return undefined;
        setError(err instanceof ApiError ? err.message : "Error");
        return undefined;
      }
    },
    [pageSize, foldersByAccount, activeCategory],
  );

  const loadUnified = useCallback(
    async (page = 1, categoryOverride?: string) => {
      const requestId = ++unifiedRequestIdRef.current;
      try {
        const result = await api.mail.unifiedInbox(page, pageSize, categoryOverride ?? activeCategory);
        if (requestId !== unifiedRequestIdRef.current) return;
        setUnifiedMessages(result.items);
        setTotalCount(result.total);
        setCurrentPage(result.page);
        setServerCategoryCounts(result.categoryCounts ?? {});
        setServerUnreadCategoryCounts(result.unreadCategoryCounts ?? {});
        return result.items;
      } catch (err) {
        if (requestId !== unifiedRequestIdRef.current) return undefined;
        setError(err instanceof ApiError ? err.message : "Error");
        return undefined;
      }
    },
    [pageSize, activeCategory],
  );

  const loadStarred = useCallback(
    async (page = 1) => {
      try {
        const result = await api.mail.starred(page, pageSize);
        setStarredMessages(result.items);
        setTotalCount(result.total);
        setCurrentPage(result.page);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Error");
      }
    },
    [pageSize],
  );

  // Bandeja unificada por defecto al cargar cuentas.
  useEffect(() => {
    if (!loadingAccounts && accounts.length > 0 && viewMode === UNIFIED) {
      loadUnified();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingAccounts, accounts.length]);

  useEffect(() => {
    setSelectedMessage(null);
    setSelectedIds(new Set());
    setBodyData(null);
    setBodyError(null);
    setActiveCategory("PRIMARY");
    setCurrentPage(1);
  }, [activeAccountId, activeFolderId, viewMode]);

  async function toggleAccount(accountId: string) {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null);
      return;
    }
    setExpandedAccountId(accountId);
    if (!foldersByAccount[accountId]) {
      await loadFolders(accountId, true);
    }
  }

  async function selectFolder(accountId: string, folderId: string) {
    setViewMode("account");
    setActiveAccountId(accountId);
    setActiveFolderId(folderId);
    setActiveCategory("PRIMARY");
    await loadMessages(accountId, folderId, 1, "PRIMARY");
  }

  function selectUnified() {
    setViewMode(UNIFIED);
    setActiveAccountId(null);
    setActiveFolderId(null);
    setActiveCategory("PRIMARY");
    loadUnified(1, "PRIMARY");
  }

  // Clic en una pestaña de categoría: recarga desde el servidor filtrando
  // por esa categoría (filtrar solo la página ya cargada no alcanza).
  function selectCategory(category: MailMessage["category"]) {
    setActiveCategory(category);
    setCurrentPage(1);
    if (viewMode === UNIFIED) loadUnified(1, category);
    else if (activeAccountId && activeFolderId) loadMessages(activeAccountId, activeFolderId, 1, category);
  }

  function selectStarred() {
    setViewMode(STARRED);
    setActiveAccountId(null);
    setActiveFolderId(null);
    loadStarred();
  }

  async function handleSync(accountId: string) {
    setSyncing(true);
    setError(null);
    const prevIds = new Set(currentMessageList().map((m) => m.id));
    try {
      await api.mail.sync(accountId);
      await loadFolders(accountId);
      if (viewMode === "account" && activeAccountId === accountId && activeFolderId) {
        const items = await loadMessages(accountId, activeFolderId);
        markNewMessages(prevIds, items);
      }
      if (viewMode === UNIFIED) markNewMessages(prevIds, await loadUnified());
      if (viewMode === STARRED) await loadStarred();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSyncing(false);
    }
  }

  // En "Todos los correos"/"Destacados" no hay una sola cuenta activa para
  // sincronizar — antes el botón simplemente quedaba deshabilitado ahí (se
  // veía como si "no funcionara" el refresh, que es justo la vista por
  // defecto al entrar). Ahora sincroniza todas las cuentas del usuario.
  async function handleSyncAll() {
    setSyncing(true);
    setError(null);
    const prevIds = new Set(currentMessageList().map((m) => m.id));
    try {
      await Promise.all(accounts.map((acc) => api.mail.sync(acc.id).catch(() => undefined)));
      if (viewMode === UNIFIED) markNewMessages(prevIds, await loadUnified());
      if (viewMode === STARRED) await loadStarred();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setSyncing(false);
    }
  }

  function refreshCurrentList() {
    if (viewMode === UNIFIED) return loadUnified(currentPage);
    if (viewMode === STARRED) return loadStarred(currentPage);
    if (activeAccountId && activeFolderId) return loadMessages(activeAccountId, activeFolderId, currentPage);
    return Promise.resolve();
  }

  function goToPage(page: number) {
    if (viewMode === UNIFIED) loadUnified(page);
    else if (viewMode === STARRED) loadStarred(page);
    else if (activeAccountId && activeFolderId) loadMessages(activeAccountId, activeFolderId, page);
  }

  function currentMessageList(): (MailMessage | UnifiedMessage)[] {
    if (viewMode === UNIFIED) return unifiedMessages;
    if (viewMode === STARRED) return starredMessages;
    return messages;
  }

  async function openMessage(message: MailMessage, accountId: string, folderId: string) {
    setSelectedMessage(message);
    setSelectedFolderId(folderId);
    setBodyData(null);
    setBodyError(null);
    setThreadReply(null);
    if (!message.isRead) {
      api.mail
        .setFlags(accountId, message.id, { isRead: true })
        .then(() => {
          refreshCurrentList();
          refreshFolderCounts(accountId);
        })
        .catch(() => undefined);
    }
    try {
      const result = await api.mail.body(accountId, folderId, message.uid);
      setBodyData(result);
    } catch (err) {
      setBodyError(err instanceof ApiError ? err.message : "Error");
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function currentAccountIdFor(message: MailMessage | UnifiedMessage): string {
    return "mailAccount" in message ? message.mailAccount.id : (activeAccountId as string);
  }

  async function toggleFlag(message: MailMessage | UnifiedMessage) {
    const accId = currentAccountIdFor(message);
    try {
      await api.mail.setFlags(accId, message.id, { isFlagged: !message.isFlagged });
      await refreshCurrentList();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function toggleReadForRow(message: MailMessage | UnifiedMessage) {
    const accId = currentAccountIdFor(message);
    try {
      await api.mail.setFlags(accId, message.id, { isRead: !message.isRead });
      await refreshCurrentList();
      refreshFolderCounts(accId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function archiveMessageFromRow(message: MailMessage | UnifiedMessage) {
    const accId = currentAccountIdFor(message);
    try {
      await api.mail.archiveMessage(accId, message.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
    removeMessagesFromState(new Set([message.id]));
    refreshFolderCounts(accId);
  }

  async function deleteMessageFromRow(message: MailMessage | UnifiedMessage) {
    const accId = currentAccountIdFor(message);
    try {
      await api.mail.deleteMessage(accId, message.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
    removeMessagesFromState(new Set([message.id]));
    refreshFolderCounts(accId);
  }

  // En vez de recargar toda la lista tras borrar/mover (lo que puede
  // pisarse con el siguiente click y mandar un id que ya no existe), lo
  // quitamos del estado local al toque — evita el "Internal error" por
  // condiciones de carrera y se siente instantáneo.
  // Borrar/mover/marcar cambia los contadores de la carpeta (no leídos/
  // total) del lado del servidor; si esa cuenta está expandida en el
  // sidebar, refrescamos sus carpetas para que no se queden desactualizadas.
  function refreshFolderCounts(accountId: string) {
    if (foldersByAccount[accountId]) loadFolders(accountId);
  }

  function removeMessagesFromState(ids: Set<string>) {
    setMessages((prev) => prev.filter((m) => !ids.has(m.id)));
    setUnifiedMessages((prev) => prev.filter((m) => !ids.has(m.id)));
    setStarredMessages((prev) => prev.filter((m) => !ids.has(m.id)));
    setSelectedIds((prev) => {
      if (![...ids].some((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  async function bulkAction(action: "read" | "unread" | "delete" | "spam") {
    const list = currentMessageList();
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    // Agrupar por cuenta (la bandeja unificada puede mezclar varias).
    const byAccount = new Map<string, string[]>();
    for (const id of ids) {
      const msg = list.find((m) => m.id === id);
      if (!msg) continue;
      const accId = currentAccountIdFor(msg);
      byAccount.set(accId, [...(byAccount.get(accId) ?? []), id]);
    }

    setBulkProgress(
      action === "delete" ? t("progress.deleting") : action === "spam" ? t("progress.markingSpam") : t("progress.updating"),
    );
    try {
      for (const [accId, msgIds] of byAccount) {
        if (action === "read") await api.mail.bulkSetFlags(accId, msgIds, { isRead: true });
        else if (action === "unread") await api.mail.bulkSetFlags(accId, msgIds, { isRead: false });
        else if (action === "delete") await api.mail.bulkDeleteMessages(accId, msgIds);
        else if (action === "spam") await api.mail.bulkMarkSpam(accId, msgIds);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBulkProgress(null);
    }

    if (action === "delete" || action === "spam") {
      removeMessagesFromState(new Set(ids));
      byAccount.forEach((_, accId) => refreshFolderCounts(accId));
    } else {
      setSelectedIds(new Set());
      await refreshCurrentList();
      if (action === "read" || action === "unread") byAccount.forEach((_, accId) => refreshFolderCounts(accId));
    }
    setSelectedMessage(null);
  }

  async function handleEmptyFolder() {
    if (!activeAccountId || !activeFolderId) return;
    const isTrash = activeFolder?.specialUse === "\\Trash";
    setConfirmState({
      title: isTrash ? t("folder.emptyTrash") : t("folder.emptySpam"),
      message: t("confirm.emptyFolder"),
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        setBulkProgress(t("progress.emptyingFolder"));
        try {
          await api.mail.emptyFolder(activeAccountId, activeFolderId);
          setMessages([]);
          setTotalCount(0);
          refreshFolderCounts(activeAccountId);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Error");
        } finally {
          setBulkProgress(null);
        }
      },
    });
  }

  async function bulkMoveSelected(accountId: string, targetFolderId: string) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkProgress(t("progress.moving"));
    try {
      await api.mail.bulkMoveMessages(accountId, ids, targetFolderId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setBulkProgress(null);
    }
    removeMessagesFromState(new Set(ids));
    refreshFolderCounts(accountId);
  }

  async function moveMessageToFolder(message: MailMessage, accountId: string, targetFolderId: string) {
    try {
      await api.mail.moveMessage(accountId, message.id, targetFolderId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
    removeMessagesFromState(new Set([message.id]));
    refreshFolderCounts(accountId);
  }

  async function handleCreateFolder() {
    if (!newFolderFor || !newFolderName.trim()) return;
    try {
      await api.mail.createFolder(newFolderFor, newFolderName.trim());
      await loadFolders(newFolderFor);
      setNewFolderName("");
      setNewFolderFor(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    }
  }

  async function handleFolderColor(accountId: string, folderId: string, color: string | null) {
    await api.mail.updateFolder(accountId, folderId, { color });
    await loadFolders(accountId);
  }

  function handleRenameFolder(accountId: string, folderId: string, currentName: string) {
    setPromptState({
      title: t("sidebar.editAccount"),
      label: t("sidebar.newFolder.name"),
      initialValue: currentName,
      onSubmit: async (next) => {
        setPromptState(null);
        if (next === currentName) return;
        try {
          await api.mail.updateFolder(accountId, folderId, { name: next });
          await loadFolders(accountId);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      },
    });
  }

  function handleDeleteFolder(accountId: string, folderId: string, name: string) {
    setConfirmState({
      title: t("list.delete"),
      message: `${t("addAccount.deleteConfirm")} (${name})`,
      danger: true,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.mail.deleteFolder(accountId, folderId);
          if (activeFolderId === folderId) {
            setActiveFolderId(null);
            setMessages([]);
          }
          await loadFolders(accountId);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : "Error");
        }
      },
    });
  }

  // Responder/reenviar se abre embebido dentro del hilo (como Gmail), no en
  // la ventana emergente/pantalla completa — esa preferencia es solo para
  // mensajes nuevos desde "Redactar".
  function openReply(message: MailMessage, forward: boolean) {
    const account = accounts.find((a) => a.id === (activeAccountId ?? currentAccountIdFor(message)));
    const quotedContent = bodyData?.html
      ? bodyData.html
      : bodyData?.text
        ? `<p>${escapeHtml(bodyData.text).replace(/\n/g, "<br>")}</p>`
        : "";
    // Igual que Gmail: el mensaje citado arranca oculto detrás de un botón
    // "⋯" en vez de mostrarse desplegado de una — contenteditable="false"
    // en el botón para que no se pueda escribir "dentro" de él sin querer.
    const quoted = quotedContent
      ? `<span class="quote-toggle" contenteditable="false" onclick="this.nextElementSibling.classList.add('expanded');this.style.display='none';">⋯</span><blockquote class="quoted-content">${quotedContent}</blockquote>`
      : "";
    setThreadReply({
      to: forward ? "" : message.fromAddress ?? "",
      subject: `${forward ? "Fwd: " : "Re: "}${message.subject ?? ""}`,
      html: `<p></p>${account?.signature ? account.signature : ""}${quoted}`,
      inReplyTo: forward ? undefined : (message.messageId ?? undefined),
    });
  }

  const activeFolder = activeAccountId
    ? (foldersByAccount[activeAccountId] ?? []).find((f) => f.id === activeFolderId)
    : null;
  const showCategoryTabs = viewMode === UNIFIED || activeFolder?.specialUse === "\\Inbox";

  // Una categoría que el usuario desactivó en Ajustes > Temas no tiene tab
  // propio: sus mensajes se pliegan dentro de "Principal" en vez de quedar
  // ocultos sin ninguna forma de verlos.
  function effectiveCategory(category: MailMessage["category"]): MailMessage["category"] {
    if (category === "PRIMARY") return "PRIMARY";
    return enabledCategories.includes(category) ? category : "PRIMARY";
  }

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [rawCategory, n] of Object.entries(serverCategoryCounts)) {
      const c = effectiveCategory(rawCategory as MailMessage["category"]);
      counts[c] = (counts[c] ?? 0) + n;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverCategoryCounts, enabledCategories]);

  // Número que se muestra en cada pestaña: no leídos (nuevos), no el total.
  const unreadCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [rawCategory, n] of Object.entries(serverUnreadCategoryCounts)) {
      const c = effectiveCategory(rawCategory as MailMessage["category"]);
      counts[c] = (counts[c] ?? 0) + n;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUnreadCategoryCounts, enabledCategories]);

  // Las pestañas (y por lo tanto el filtro por categoría) solo tienen
  // sentido si hay más de una categoría presente en lo cargado — si no, no
  // hay tab para elegir otra y el filtro dejaba la lista vacía sin ninguna
  // forma de salir de ahí (quedaba "atascada" en Principal aunque todo lo
  // cargado fuera, por ejemplo, Notificaciones).
  const categoryFilterActive = showCategoryTabs && Object.keys(categoryCounts).length > 1;

  const visibleMessages = useMemo(() => {
    let list: (MailMessage | UnifiedMessage)[] = currentMessageList();
    if (categoryFilterActive) list = list.filter((m) => effectiveCategory(m.category) === activeCategory);
    if (!search) return list;
    return list.filter((m) =>
      `${m.subject ?? ""} ${m.fromName ?? ""} ${m.fromAddress ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, unifiedMessages, starredMessages, messages, search, activeCategory, categoryFilterActive, enabledCategories]);

  const currentComposeAccountId = activeAccountId ?? accounts.find((a) => a.isPrimary)?.id ?? accounts[0]?.id;

  // "Redactar" en modo POPUP: cada click abre una ventana más (Gmail deja
  // abrir varias a la vez) — las dos primeras de tamaño normal, el resto
  // arranca minimizada. En modo FULLSCREEN sigue siendo una sola (reemplaza
  // la vista, no tiene sentido apilar varias).
  function openComposeWindow(accountId: string, initial?: ComposeInitial) {
    if (composeStyle === "FULLSCREEN") {
      setComposeInitial(initial);
      setShowCompose(true);
      return;
    }
    setComposeWindows((prev) => {
      const openFullCount = prev.filter((w) => !w.minimized).length;
      const id = `compose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return [...prev, { id, accountId, initial, minimized: openFullCount >= 2 }];
    });
  }

  function closeComposeWindow(id: string) {
    setComposeWindows((prev) => prev.filter((w) => w.id !== id));
  }

  function setComposeWindowMinimized(id: string, minimized: boolean) {
    setComposeWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized } : w)));
  }

  if (!loadingAccounts && accounts.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
          </svg>
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">{t("addAccount.description")}</p>
        <button
          onClick={() => setShowAddAccount(true)}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
        >
          {t("sidebar.addAccount")}
        </button>
        {showAddAccount ? (
          <AddAccountDialog
            addons={addons}
            onClose={() => setShowAddAccount(false)}
            onCreated={() => {
              setShowAddAccount(false);
              loadAccounts();
            }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <AppRail />
      {activeApp === "contacts" ? (
        <ContactsApp sidebarCollapsed={sidebarCollapsed} />
      ) : (
        <>
      {!sidebarCollapsed ? (
      <>
      {/* En mobile el sidebar flota encima del contenido (con este fondo
          para cerrarlo tocando afuera) en vez de empujarlo, como cualquier
          menú hamburguesa de app — en desktop este div no se ve (hidden). */}
      <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={toggleSidebar} />
      <aside
        onClick={(e) => {
          // Elegir algo en el drawer (redactar, una cuenta, una carpeta) lo
          // cierra en mobile — en desktop no hace nada (ya está fijo).
          if (isMobile && (e.target as HTMLElement).closest("button")) closeSidebar();
        }}
        className="fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col gap-3 overflow-y-auto bg-background px-3 py-4 shadow-2xl md:static md:z-auto md:shadow-none"
      >
        <MobileAppSwitcher />
        <button
          onClick={() => {
            if (currentComposeAccountId) openComposeWindow(currentComposeAccountId);
          }}
          disabled={!currentComposeAccountId}
          className="flex items-center gap-3 self-start rounded-2xl bg-accent-soft px-6 py-4 text-sm font-medium text-foreground shadow-sm transition hover:shadow-md disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          {t("sidebar.compose")}
        </button>

        <button
          onClick={selectUnified}
          className={`flex items-center gap-3 rounded-r-full px-4 py-2 text-left text-sm ${
            viewMode === UNIFIED ? "bg-accent-soft font-medium text-accent" : "hover:bg-surface-hover"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {t("sidebar.allInboxes")}
        </button>

        <button
          onClick={selectStarred}
          className={`flex items-center gap-3 rounded-r-full px-4 py-2 text-left text-sm ${
            viewMode === STARRED ? "bg-accent-soft font-medium text-accent" : "hover:bg-surface-hover"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />
          </svg>
          {t("sidebar.starred")}
        </button>

        <div className="flex flex-col gap-1 border-t border-border pt-2">
          {accounts.map((account) => (
            <div key={account.id}>
              <div className="group flex items-center gap-1">
                <button
                  onClick={() => toggleAccount(account.id)}
                  className="flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-surface-hover"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`shrink-0 transition-transform ${expandedAccountId === account.id ? "rotate-90" : ""}`}
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-medium text-accent">
                    {account.emailAddress.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{account.label}</span>
                  {account.isPrimary ? (
                    <span className="shrink-0 text-amber-500" title={t("addAccount.primary")}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />
                      </svg>
                    </span>
                  ) : null}
                </button>
                <button
                  onClick={() => setEditingAccount(account)}
                  title={t("sidebar.editAccount")}
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover group-hover:flex"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                  </svg>
                </button>
              </div>

              {expandedAccountId === account.id ? (
                <div className="ml-6 flex flex-col gap-0.5 border-l border-border pl-2">
                  {(foldersByAccount[account.id] ?? []).map((folder) => (
                    <div
                      key={folder.id}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const raw = e.dataTransfer.getData("application/json");
                        if (!raw) return;
                        const { messageId, accountId: fromAccount } = JSON.parse(raw);
                        const msg = currentMessageList().find((m) => m.id === messageId);
                        if (msg) moveMessageToFolder(msg, fromAccount, folder.id);
                      }}
                      className="group flex items-center gap-2"
                    >
                      <FolderColorPicker
                        value={folder.color}
                        onChange={(color) => handleFolderColor(account.id, folder.id, color)}
                      />
                      <button
                        onClick={() => selectFolder(account.id, folder.id)}
                        className={`flex flex-1 items-center gap-2 rounded-r-full py-1.5 pr-1 text-left text-sm ${
                          viewMode === "account" && activeAccountId === account.id && activeFolderId === folder.id
                            ? "bg-accent-soft font-medium text-accent"
                            : "hover:bg-surface-hover"
                        }`}
                      >
                        <FolderIcon specialUse={folder.specialUse} />
                        <span className="flex-1 truncate">{folderDisplayName(folder, t)}</span>
                        {folder.unreadCount > 0 ? <span className="text-xs">{folder.unreadCount}</span> : null}
                      </button>
                      {!folder.specialUse ? (
                        <span className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameFolder(account.id, folder.id, folder.name);
                            }}
                            title={t("sidebar.editAccount")}
                            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-surface-hover"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFolder(account.id, folder.id, folder.name);
                            }}
                            title={t("list.delete")}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-danger hover:bg-surface-hover"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                            </svg>
                          </button>
                        </span>
                      ) : null}
                    </div>
                  ))}

                  {newFolderFor === account.id ? (
                    <div className="flex items-center gap-1 py-1">
                      <input
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                        placeholder={t("sidebar.newFolder.name")}
                        className="input h-7 flex-1 text-xs"
                      />
                      <button onClick={handleCreateFolder} className="text-xs text-accent">
                        {t("sidebar.newFolder.create")}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNewFolderFor(account.id)}
                      className="flex items-center gap-2 py-1.5 text-left text-xs text-muted-foreground hover:text-accent"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                      </svg>
                      {t("sidebar.newFolder")}
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowAddAccount(true)}
          className="flex items-center gap-2 rounded-r-full px-4 py-2 text-left text-xs text-muted-foreground hover:bg-surface-hover"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          {t("sidebar.addAccount")}
        </button>
      </aside>
      </>
      ) : null}

      <main className="flex min-w-0 flex-1 flex-col bg-surface">
        {oauthNotice ? (
          <p className="flex items-center justify-between px-4 py-2 text-sm text-accent">
            {oauthNotice}
            <button onClick={() => setOauthNotice(null)} className="text-xs text-muted-foreground">
              ✕
            </button>
          </p>
        ) : null}
        {error ? <p className="px-4 py-2 text-sm text-danger">{error}</p> : null}

        <div className="flex min-h-0 flex-1 flex-col">
          {showCompose && composeStyle === "FULLSCREEN" && currentComposeAccountId ? (
            <div className="flex min-w-0 flex-1 flex-col p-6">
              <ComposeDialog
                accounts={accounts}
                defaultAccountId={currentComposeAccountId}
                variant="inline"
                initial={composeInitial}
                onClose={() => setShowCompose(false)}
                onSent={() => setShowCompose(false)}
              />
            </div>
          ) : (
            <>
              {effectiveColumns === 3 || effectiveColumns === 4 || !selectedMessage ? (
                <>
              <div className="flex items-center gap-2 border-b border-border px-4 py-1.5">
                <SelectAllMenu
                  checked={selectedIds.size > 0 && selectedIds.size === visibleMessages.length}
                  indeterminate={selectedIds.size > 0 && selectedIds.size < visibleMessages.length}
                  onSelect={(mode) => {
                    if (mode === "all") setSelectedIds(new Set(visibleMessages.map((m) => m.id)));
                    else if (mode === "none") setSelectedIds(new Set());
                    else if (mode === "read")
                      setSelectedIds(new Set(visibleMessages.filter((m) => m.isRead).map((m) => m.id)));
                    else if (mode === "unread")
                      setSelectedIds(new Set(visibleMessages.filter((m) => !m.isRead).map((m) => m.id)));
                    else if (mode === "flagged")
                      setSelectedIds(new Set(visibleMessages.filter((m) => m.isFlagged).map((m) => m.id)));
                    else if (mode === "unflagged")
                      setSelectedIds(new Set(visibleMessages.filter((m) => !m.isFlagged).map((m) => m.id)));
                  }}
                />
                {selectedIds.size > 0 ? (
                  <>
                    <span className="px-2 text-xs text-muted-foreground">
                      {selectedIds.size} {t("list.selected")}
                    </span>
                    <ToolbarIconButton title={t("list.markRead")} onClick={() => bulkAction("read")}>
                      <path d="m4 12 5 5L20 6" />
                    </ToolbarIconButton>
                    <ToolbarIconButton title={t("list.markUnread")} onClick={() => bulkAction("unread")}>
                      <circle cx="12" cy="12" r="8" />
                    </ToolbarIconButton>
                    <ToolbarIconButton title={t("list.spam")} onClick={() => bulkAction("spam")}>
                      <path d="M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                    </ToolbarIconButton>
                    <ToolbarIconButton
                      title={t("list.delete")}
                      onClick={() =>
                        setConfirmState({
                          title: t("list.delete"),
                          message: t("confirm.bulkDelete"),
                          danger: true,
                          onConfirm: () => {
                            setConfirmState(null);
                            bulkAction("delete");
                          },
                        })
                      }
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                    </ToolbarIconButton>
                    {(() => {
                      const selectedAccounts = new Set(
                        currentMessageList()
                          .filter((m) => selectedIds.has(m.id))
                          .map((m) => currentAccountIdFor(m)),
                      );
                      if (selectedAccounts.size !== 1) return null;
                      const soleAccountId = [...selectedAccounts][0];
                      return (
                        <MoveToMenu
                          accountId={soleAccountId}
                          onMove={(folderId) => bulkMoveSelected(soleAccountId, folderId)}
                        />
                      );
                    })()}
                  </>
                ) : (
                  <button
                    onClick={() => (activeAccountId ? handleSync(activeAccountId) : handleSyncAll())}
                    disabled={syncing || (!activeAccountId && accounts.length === 0)}
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-hover disabled:opacity-50"
                    title={syncing ? t("sidebar.syncing") : t("sidebar.sync")}
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={syncing ? "animate-spin" : ""}
                    >
                      <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
                    </svg>
                  </button>
                )}

                <div className="flex-1" />

                {totalCount > 0 ? (
                  <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <span>
                      {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalCount)}{" "}
                      {t("pagination.of")} {totalCount}
                    </span>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-hover disabled:opacity-30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage * pageSize >= totalCount}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-hover disabled:opacity-30"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                ) : null}
              </div>

              {viewMode === "account" && (activeFolder?.specialUse === "\\Trash" || activeFolder?.specialUse === "\\Junk") && visibleMessages.length > 0 ? (
                <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {activeFolder.specialUse === "\\Trash" ? t("folder.trashHint") : t("folder.spamHint")}
                  </span>
                  <button
                    onClick={handleEmptyFolder}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium hover:bg-surface-hover"
                  >
                    {activeFolder.specialUse === "\\Trash" ? t("folder.emptyTrash") : t("folder.emptySpam")}
                  </button>
                </div>
              ) : null}

              {showCategoryTabs && Object.keys(categoryCounts).length > 1 ? (
                <div className="flex items-stretch overflow-x-auto border-b border-border bg-surface-muted/40">
                  {(["PRIMARY", "SOCIAL", "PROMOTIONS", "UPDATES", "FORUMS"] as const)
                    .filter((c) => categoryCounts[c] > 0)
                    .map((c) => (
                      <button
                        key={c}
                        onClick={() => selectCategory(c)}
                        className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm ${
                          activeCategory === c
                            ? "border-accent font-medium text-accent"
                            : "border-transparent text-muted-foreground hover:bg-surface-hover"
                        }`}
                      >
                        <CategoryIcon category={c} />
                        {t(`category.${c.toLowerCase()}` as never)}
                        {unreadCategoryCounts[c] > 0 ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                              activeCategory === c ? "bg-accent-soft" : "bg-surface-muted text-muted-foreground"
                            }`}
                          >
                            {unreadCategoryCounts[c]}
                          </span>
                        ) : null}
                      </button>
                    ))}
                </div>
              ) : null}
                </>
              ) : null}

              <div className={effectiveColumns === 4 ? "flex min-h-0 flex-1 flex-col" : "flex min-h-0 flex-1"}>
                {effectiveColumns === 3 || effectiveColumns === 4 || !selectedMessage ? (
                  <>
                  <div
                    className={`flex min-h-0 min-w-0 flex-col ${effectiveColumns === 3 || effectiveColumns === 4 ? "shrink-0" : "flex-1"}`}
                    style={
                      effectiveColumns === 3
                        ? { width: listColumnWidth }
                        : effectiveColumns === 4
                          ? { height: listRowHeight }
                          : undefined
                    }
                  >
              <div className="flex-1 overflow-y-auto">
                {visibleMessages.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">{t("list.empty")}</p>
                ) : (
                  visibleMessages.map((message) => {
                    const msgAccountId = currentAccountIdFor(message);
                    const msgFolderId = "folder" in message ? message.folder.id : (activeFolderId as string);
                    const rowPadding =
                      density === "COMPACT" ? "py-1" : density === "COMFORTABLE" ? "py-4" : "py-2.5";
                    return (
                      <button
                        key={message.id}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData(
                            "application/json",
                            JSON.stringify({ messageId: message.id, accountId: msgAccountId }),
                          )
                        }
                        onClick={() => openMessage(message, msgAccountId, msgFolderId)}
                        className={`group flex w-full items-center gap-2 border-b border-border px-2 sm:gap-3 sm:px-3 ${rowPadding} text-left text-sm hover:z-10 hover:shadow-md ${
                          selectedIds.has(message.id) ? "bg-accent-soft" : ""
                        }`}
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelected(message.id);
                          }}
                          className={`h-4 w-4 shrink-0 rounded-sm border ${
                            selectedIds.has(message.id) ? "border-accent bg-accent" : "border-muted-foreground"
                          }`}
                        />
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFlag(message);
                          }}
                          className={`shrink-0 ${message.isFlagged ? "text-amber-500" : "text-muted-foreground"}`}
                        >
                          <svg
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill={message.isFlagged ? "currentColor" : "none"}
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01Z" />
                          </svg>
                        </span>
                        {"mailAccount" in message ? (
                          <span className="hidden w-24 shrink-0 truncate text-xs text-muted-foreground md:inline">
                            {message.mailAccount.label}
                          </span>
                        ) : null}
                        {/* Angosto en mobile (no entran 160px de remitente +
                            asunto en una pantalla de teléfono) — se ensancha
                            de vuelta a partir de sm. */}
                        <span className="flex w-20 shrink-0 items-center gap-1.5 truncate sm:w-40">
                          <span
                            className={`truncate ${!message.isRead ? "font-semibold" : "text-muted-foreground"}`}
                          >
                            {message.fromName || message.fromAddress || t("list.unknownSender")}
                          </span>
                          {newMessageIds.has(message.id) ? (
                            <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                              {t("list.new")}
                            </span>
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className={!message.isRead ? "font-semibold" : ""}>
                            {message.subject || t("list.noSubject")}
                          </span>
                        </span>
                        <span className="relative flex shrink-0 items-center">
                          <span className="text-xs text-muted-foreground group-hover:hidden">
                            {formatMessageDate(message.receivedAt, locale)}
                          </span>
                          <span className="hidden items-center gap-0.5 group-hover:flex">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveMessageFromRow(message);
                              }}
                              title={t("reader.archive")}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-hover"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                              </svg>
                            </span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessageFromRow(message);
                              }}
                              title={t("reader.delete")}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-hover"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                              </svg>
                            </span>
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReadForRow(message);
                              }}
                              title={message.isRead ? t("list.markUnread") : t("list.markRead")}
                              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-hover"
                            >
                              {message.isRead ? (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="8" />
                                </svg>
                              ) : (
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="m4 12 5 5L20 6" />
                                </svg>
                              )}
                            </span>
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            {effectiveColumns === 3 ? (
              <div
                onMouseDown={startColumnResize}
                title={t("list.resizeColumn")}
                className={`w-1.5 shrink-0 cursor-col-resize bg-border hover:bg-accent ${
                  resizingColumn ? "bg-accent" : ""
                }`}
              />
            ) : effectiveColumns === 4 ? (
              <div
                onMouseDown={startRowResize}
                title={t("list.resizeRow")}
                className={`h-1.5 shrink-0 cursor-row-resize bg-border hover:bg-accent ${
                  resizingRow ? "bg-accent" : ""
                }`}
              />
            ) : null}
                  </>
          ) : null}

          {showCompose && composeStyle === "FULLSCREEN" ? null : selectedMessage ? (
            <div className="flex min-w-0 flex-1 flex-col overflow-y-auto p-3 sm:p-6">
              {/* overflow-x-auto: red de seguridad para que en un teléfono
                  angosto (320-360px) esta fila de 7 acciones nunca se corte
                  ni desborde la pantalla — se puede deslizar en vez de romper
                  el layout. */}
              <div className="mb-4 flex items-center gap-0.5 overflow-x-auto sm:gap-1">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-hover"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div className="flex-1 shrink-0" />
                <ToolbarIconButton title={t("reader.reply")} onClick={() => openReply(selectedMessage, false)}>
                  <path d="M9 17H4v-5l9-9 5 5-9 9Z" />
                </ToolbarIconButton>
                <ToolbarIconButton title={t("reader.forward")} onClick={() => openReply(selectedMessage, true)}>
                  <path d="M12 5 19 12l-7 7M5 12h14" />
                </ToolbarIconButton>
                <ToolbarIconButton
                  title={selectedMessage.isRead ? t("reader.markUnread") : t("list.markRead")}
                  onClick={() => {
                    const accId = currentAccountIdFor(selectedMessage);
                    api.mail
                      .setFlags(accId, selectedMessage.id, { isRead: !selectedMessage.isRead })
                      .then(() => {
                        refreshFolderCounts(accId);
                        setSelectedMessage(null);
                        refreshCurrentList();
                      })
                      .catch(() => undefined);
                  }}
                >
                  {selectedMessage.isRead ? (
                    <circle cx="12" cy="12" r="8" />
                  ) : (
                    <path d="m4 12 5 5L20 6" />
                  )}
                </ToolbarIconButton>
                <ToolbarIconButton
                  title={t("reader.archive")}
                  onClick={async () => {
                    await archiveMessageFromRow(selectedMessage);
                    setSelectedMessage(null);
                  }}
                >
                  <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                </ToolbarIconButton>
                <ToolbarIconButton
                  title={t("reader.spam")}
                  onClick={async () => {
                    try {
                      const accId = currentAccountIdFor(selectedMessage);
                      await api.mail.markSpam(accId, selectedMessage.id);
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : "Error");
                    }
                    removeMessagesFromState(new Set([selectedMessage.id]));
                    refreshFolderCounts(currentAccountIdFor(selectedMessage));
                    setSelectedMessage(null);
                  }}
                >
                  <path d="M12 9v4M12 17h.01M10.3 3.9 2.5 17a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
                </ToolbarIconButton>
                <MoveToMenu
                  accountId={currentAccountIdFor(selectedMessage)}
                  onMove={async (folderId) => {
                    await moveMessageToFolder(selectedMessage, currentAccountIdFor(selectedMessage), folderId);
                    setSelectedMessage(null);
                  }}
                />
                <ToolbarIconButton
                  title={t("reader.delete")}
                  onClick={async () => {
                    try {
                      const accId = currentAccountIdFor(selectedMessage);
                      await api.mail.deleteMessage(accId, selectedMessage.id);
                    } catch (err) {
                      setError(err instanceof ApiError ? err.message : "Error");
                    }
                    removeMessagesFromState(new Set([selectedMessage.id]));
                    refreshFolderCounts(currentAccountIdFor(selectedMessage));
                    setSelectedMessage(null);
                  }}
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
                </ToolbarIconButton>
              </div>

              <h1 className="mb-3 text-xl font-normal">{selectedMessage.subject || t("list.noSubject")}</h1>
              <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-medium text-accent">
                  {(selectedMessage.fromName || selectedMessage.fromAddress || "?").charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-medium">
                    {selectedMessage.fromName || selectedMessage.fromAddress || t("list.unknownSender")}
                  </p>
                  <p className="text-muted-foreground">{selectedMessage.fromAddress}</p>
                </div>
              </div>
              {bodyError ? (
                <p className="text-sm text-danger">{bodyError}</p>
              ) : bodyData ? (
                <>
                  <EmailBody html={bodyData.html} text={bodyData.text} />
                  {bodyData.attachments && bodyData.attachments.length > 0 && selectedFolderId ? (
                    <AttachmentsList
                      attachments={bodyData.attachments}
                      accountId={currentAccountIdFor(selectedMessage)}
                      folderId={selectedFolderId}
                      uid={selectedMessage.uid}
                    />
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("reader.loading")}</p>
              )}

              {!threadReply && bodyData ? (
                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={() => openReply(selectedMessage, false)}
                    className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 17H4v-5l9-9 5 5-9 9Z" />
                    </svg>
                    {t("reader.reply")}
                  </button>
                  <button
                    onClick={() => openReply(selectedMessage, true)}
                    className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-surface-hover"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5 19 12l-7 7M5 12h14" />
                    </svg>
                    {t("reader.forward")}
                  </button>
                </div>
              ) : null}

              {threadReply && currentComposeAccountId ? (
                <div className="mt-4">
                  <ComposeDialog
                    accounts={accounts}
                    defaultAccountId={currentAccountIdFor(selectedMessage)}
                    variant="thread"
                    initial={threadReply}
                    onClose={() => setThreadReply(null)}
                    onSent={() => {
                      setThreadReply(null);
                      refreshCurrentList();
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : effectiveColumns === 3 || effectiveColumns === 4 ? (
            <div className="flex-1" />
          ) : null}
              </div>
            </>
          )}
        </div>
      </main>
        </>
      )}

      {showAddAccount ? (
        <AddAccountDialog
          addons={addons}
          onClose={() => setShowAddAccount(false)}
          onCreated={() => {
            setShowAddAccount(false);
            loadAccounts();
          }}
        />
      ) : null}

      {editingAccount ? (
        <EditAccountDialog
          account={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSaved={() => {
            setEditingAccount(null);
            loadAccounts();
          }}
          onDeleted={() => {
            setEditingAccount(null);
            loadAccounts();
          }}
        />
      ) : null}

      {composeStyle === "POPUP" && composeWindows.length > 0
        ? (() => {
            const GAP = 12;
            const MINIMIZED_HEIGHT = 44;
            const V_GAP = 8;
            const offsets: Record<string, number> = {};
            const bottoms: Record<string, number> = {};

            // Ventanas completas: ancladas al borde derecho (la primera en
            // offset 0), cada nueva extiende la fila hacia la izquierda.
            const fullWindows = composeWindows.filter((w) => !w.minimized);
            let running = 0;
            fullWindows.forEach((w) => {
              offsets[w.id] = running;
              running += COMPOSE_POPUP_WIDTH + GAP;
            });

            // Minimizadas: todas en la misma columna, más a la IZQUIERDA que
            // las completas, apiladas hacia ARRIBA (no al costado) — así no
            // se pierden de vista cuando hay tres o más a la vez. La primera
            // que se minimizó queda abajo del todo; las siguientes se
            // acomodan encima sin moverla.
            const minimizedWindows = composeWindows.filter((w) => w.minimized);
            minimizedWindows.forEach((w, i) => {
              offsets[w.id] = running;
              bottoms[w.id] = i * (MINIMIZED_HEIGHT + V_GAP);
            });

            return composeWindows.map((w) => (
              <ComposeDialog
                key={w.id}
                accounts={accounts}
                defaultAccountId={w.accountId}
                variant="popup"
                initial={w.initial}
                minimized={w.minimized}
                onMinimizedChange={(value) => setComposeWindowMinimized(w.id, value)}
                dockOffset={offsets[w.id]}
                dockBottom={bottoms[w.id]}
                onClose={() => closeComposeWindow(w.id)}
                onSent={() => closeComposeWindow(w.id)}
              />
            ));
          })()
        : null}

      {confirmState ? (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      ) : null}

      {promptState ? (
        <PromptDialog
          title={promptState.title}
          label={promptState.label}
          initialValue={promptState.initialValue}
          onSubmit={promptState.onSubmit}
          onCancel={() => setPromptState(null)}
        />
      ) : null}

      {bulkProgress ? <ProgressDialog message={bulkProgress} /> : null}
    </div>
  );
}

function AttachmentsList({
  attachments,
  accountId,
  folderId,
  uid,
}: {
  attachments: MailAttachment[];
  accountId: string;
  folderId: string;
  uid: number;
}) {
  const { t } = useLocale();
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(attachment: MailAttachment) {
    setError(null);
    setDownloadingIndex(attachment.index);
    try {
      await api.mail.downloadAttachment(accountId, folderId, uid, attachment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setDownloadingIndex(null);
    }
  }

  async function handleDownloadAll() {
    setError(null);
    setDownloadingZip(true);
    try {
      await api.mail.downloadAllAttachments(accountId, folderId, uid);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error");
    } finally {
      setDownloadingZip(false);
    }
  }

  if (attachments.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          {t("reader.attachments")} ({attachments.length})
        </p>
        {attachments.length > 1 ? (
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingZip}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-hover disabled:opacity-60"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            {downloadingZip ? "…" : t("reader.downloadAllZip")}
          </button>
        ) : null}
      </div>
      {error ? <p className="mb-2 text-xs text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {attachments.map((att) => (
          <button
            type="button"
            key={att.index}
            onClick={() => handleDownload(att)}
            disabled={downloadingIndex === att.index}
            title={att.filename}
            className="flex max-w-52 items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-surface-hover disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21.44 11.05 12.25 20.24a5 5 0 0 1-7.07-7.07l9.19-9.19a3.5 3.5 0 0 1 4.95 4.95l-9.19 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {downloadingIndex === att.index ? "…" : att.filename}
              </span>
              <span className="block text-xs text-muted-foreground">{formatAttachmentSize(att.size)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolbarIconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-hover sm:h-9 sm:w-9"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
