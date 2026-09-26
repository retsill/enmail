import { clearSession, getToken, type AuthUser } from "./auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (res.status === 401) {
    clearSession();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message ?? "Error de red", res.status);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function requestFormData<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(body.message ?? "Error de red", res.status);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function upload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);
  return requestFormData<T>(path, formData);
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export const api = {
  login: (email: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  setup: {
    status: () => request<{ needsSetup: boolean }>("/setup/status"),
    complete: (input: {
      adminName: string;
      adminEmail: string;
      adminPassword: string;
      siteName?: string;
      imapHost: string;
      imapPort: number;
      imapTls: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpTls: boolean;
    }) => request<LoginResponse>("/setup", { method: "POST", body: JSON.stringify(input) }),
  },

  me: {
    getPreferences: () => request<UserPreferences>("/me/preferences"),
    updatePreferences: (input: Partial<UserPreferences>) =>
      request<UserPreferences>("/me/preferences", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    uploadBackground: (file: File) => upload<UserPreferences>("/me/preferences/background", file),

    getProfile: () => request<UserProfile>("/me"),
    updateProfile: (name: string) =>
      request<UserProfile>("/me", { method: "PATCH", body: JSON.stringify({ name }) }),
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: true }>("/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    uploadAvatar: (file: File) => upload<UserProfile>("/me/avatar", file),
  },

  contacts: {
    list: (search?: string) =>
      request<Contact[]>(`/contacts${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    create: (email: string, name?: string) =>
      request<Contact>("/contacts", { method: "POST", body: JSON.stringify({ email, name }) }),
    update: (id: string, input: { email?: string; name?: string }) =>
      request<Contact>(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    remove: (id: string) => request<{ ok: true }>(`/contacts/${id}`, { method: "DELETE" }),
  },

  mailAccounts: {
    list: () => request<MailAccount[]>("/mail-accounts"),
    create: (input: CreateMailAccountInput) =>
      request<MailAccount>("/mail-accounts", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    update: (id: string, input: Partial<CreateMailAccountInput & { signature: string; displayName: string }>) =>
      request<MailAccount>(`/mail-accounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    remove: (id: string) => request<void>(`/mail-accounts/${id}`, { method: "DELETE" }),
    setPrimary: (id: string) => request<MailAccount[]>(`/mail-accounts/${id}/primary`, { method: "POST" }),
    quota: (id: string) => request<{ usedBytes: number; limitBytes: number } | null>(`/mail-accounts/${id}/quota`),
  },

  mail: {
    sync: (accountId: string) =>
      request<{ syncedFolders: number }>(`/mail-accounts/${accountId}/sync`, {
        method: "POST",
      }),
    folders: (accountId: string) => request<MailFolder[]>(`/mail-accounts/${accountId}/folders`),
    createFolder: (accountId: string, name: string, color?: string) =>
      request<MailFolder>(`/mail-accounts/${accountId}/folders`, {
        method: "POST",
        body: JSON.stringify({ name, color }),
      }),
    updateFolder: (accountId: string, folderId: string, patch: { color?: string | null; name?: string }) =>
      request<MailFolder>(`/mail-accounts/${accountId}/folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    deleteFolder: (accountId: string, folderId: string) =>
      request<{ ok: true }>(`/mail-accounts/${accountId}/folders/${folderId}`, { method: "DELETE" }),
    messages: (accountId: string, folderId: string, page = 1, pageSize = 50, category?: string) =>
      request<PaginatedMessages<MailMessage>>(
        `/mail-accounts/${accountId}/folders/${folderId}/messages?page=${page}&pageSize=${pageSize}${category ? `&category=${category}` : ""}`,
      ),
    body: (accountId: string, folderId: string, uid: number) =>
      request<{ text?: string; html?: string }>(
        `/mail-accounts/${accountId}/folders/${folderId}/messages/${uid}/body`,
      ),
    // multipart/form-data (no JSON): permite adjuntar archivos sin pelear
    // con el límite del body JSON del servidor.
    send: (accountId: string, input: SendMessageInput) => {
      const formData = new FormData();
      formData.append("to", JSON.stringify(input.to));
      if (input.cc?.length) formData.append("cc", JSON.stringify(input.cc));
      if (input.bcc?.length) formData.append("bcc", JSON.stringify(input.bcc));
      formData.append("subject", input.subject);
      if (input.text) formData.append("text", input.text);
      if (input.html) formData.append("html", input.html);
      if (input.inReplyTo) formData.append("inReplyTo", input.inReplyTo);
      if (input.references) formData.append("references", input.references);
      for (const file of input.attachments ?? []) formData.append("attachments", file);
      return requestFormData<{ messageId: string }>(`/mail-accounts/${accountId}/send`, formData);
    },
    saveDraft: (
      accountId: string,
      input: { to?: string[]; cc?: string[]; bcc?: string[]; subject?: string; html?: string },
    ) =>
      request<{ uid?: number; folderId: string } | null>(`/mail-accounts/${accountId}/drafts`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    setFlags: (accountId: string, messageId: string, flags: { isRead?: boolean; isFlagged?: boolean }) =>
      request<MailMessage>(`/mail-accounts/${accountId}/messages/${messageId}/flags`, {
        method: "PATCH",
        body: JSON.stringify(flags),
      }),
    bulkSetFlags: (
      accountId: string,
      messageIds: string[],
      flags: { isRead?: boolean; isFlagged?: boolean },
    ) =>
      request<{ ok: true }>(`/mail-accounts/${accountId}/messages/bulk-flags`, {
        method: "POST",
        body: JSON.stringify({ messageIds, ...flags }),
      }),
    moveMessage: (accountId: string, messageId: string, targetFolderId: string) =>
      request<{ ok: true }>(`/mail-accounts/${accountId}/messages/${messageId}/move`, {
        method: "POST",
        body: JSON.stringify({ targetFolderId }),
      }),
    bulkMoveMessages: (accountId: string, messageIds: string[], targetFolderId: string) =>
      request<{ ok: true }>(`/mail-accounts/${accountId}/messages/bulk-move`, {
        method: "POST",
        body: JSON.stringify({ messageIds, targetFolderId }),
      }),
    deleteMessage: (accountId: string, messageId: string) =>
      request<{ ok: boolean }>(`/mail-accounts/${accountId}/messages/${messageId}`, {
        method: "DELETE",
      }),
    markSpam: (accountId: string, messageId: string) =>
      request<{ ok: boolean }>(`/mail-accounts/${accountId}/messages/${messageId}/spam`, {
        method: "POST",
      }),
    archiveMessage: (accountId: string, messageId: string) =>
      request<{ ok: boolean }>(`/mail-accounts/${accountId}/messages/${messageId}/archive`, {
        method: "POST",
      }),
    bulkDeleteMessages: (accountId: string, messageIds: string[]) =>
      request<{ ok: boolean; reason?: string }>(`/mail-accounts/${accountId}/messages/bulk-delete`, {
        method: "POST",
        body: JSON.stringify({ messageIds }),
      }),
    bulkMarkSpam: (accountId: string, messageIds: string[]) =>
      request<{ ok: boolean; reason?: string }>(`/mail-accounts/${accountId}/messages/bulk-spam`, {
        method: "POST",
        body: JSON.stringify({ messageIds }),
      }),
    emptyFolder: (accountId: string, folderId: string) =>
      request<{ ok: boolean }>(`/mail-accounts/${accountId}/folders/${folderId}/empty`, {
        method: "POST",
      }),
    unifiedInbox: (page = 1, pageSize = 50, category?: string) =>
      request<PaginatedMessages<UnifiedMessage>>(
        `/mail/unified-inbox?page=${page}&pageSize=${pageSize}${category ? `&category=${category}` : ""}`,
      ),
    starred: (page = 1, pageSize = 50) =>
      request<PaginatedMessages<UnifiedMessage>>(`/mail/starred?page=${page}&pageSize=${pageSize}`),
  },

  addons: {
    list: () => request<Addon[]>("/addons"),
    getConfig: (slug: string) => request<AddonConfig>(`/addons/${slug}/config`),
    updateConfig: (slug: string, input: Partial<AddonConfig> & { clientSecret?: string }) =>
      request<AddonConfig>(`/addons/${slug}/config`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    connectUrl: (slug: string) => `${API_URL}/oauth/${slug}/start?token=${getToken() ?? ""}`,
  },

  settings: {
    getSystem: () => request<SystemSettingsDto>("/settings/system"),
    updateSystem: (input: Partial<Pick<SystemSettingsDto, "siteName" | "defaultLocale">>) =>
      request<SystemSettingsDto>("/settings/system", {
        method: "PUT",
        body: JSON.stringify(input),
      }),
    uploadLogo: (file: File) => upload<SystemSettingsDto>("/settings/logo", file),
    uploadLogoDark: (file: File) => upload<SystemSettingsDto>("/settings/logo-dark", file),
    uploadFavicon: (file: File) => upload<SystemSettingsDto>("/settings/favicon", file),

    getMailServer: () => request<MailServerSettingsDto | null>("/settings/mail-server"),
    updateMailServer: (input: MailServerSettingsInput) =>
      request<MailServerSettingsDto>("/settings/mail-server", {
        method: "PUT",
        body: JSON.stringify(input),
      }),

    // Páginas dinámicas (Términos, Privacidad, etc.) — público: el login y
    // el footer las necesitan sin estar logueados.
    listPages: () => request<SitePage[]>("/settings/pages"),
    createPage: (input: { title: string; content: string }) =>
      request<SitePage>("/settings/pages", { method: "POST", body: JSON.stringify(input) }),
    updatePage: (id: string, input: { title?: string; content?: string }) =>
      request<SitePage>(`/settings/pages/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    deletePage: (id: string) => request<{ ok: true }>(`/settings/pages/${id}`, { method: "DELETE" }),
  },

  users: {
    list: () => request<AppUser[]>("/users"),
    setRole: (id: string, role: "ADMIN" | "USER") =>
      request<AppUser>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  },
};

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  authSource: "LOCAL" | "MAIL_SERVER";
  isActive: boolean;
  createdAt: string;
}

export interface SitePage {
  id: string;
  title: string;
  content: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  layoutColumns: 2 | 3 | 4;
  composeStyle: "POPUP" | "FULLSCREEN";
  pageSize: 25 | 50 | 100;
  density: "DEFAULT" | "COMFORTABLE" | "COMPACT";
  themeBackgroundType: "NONE" | "COLOR" | "IMAGE";
  themeBackground: string | null;
  backgroundOpacity: number;
  enabledCategories: string[] | null;
}

export interface Contact {
  id: string;
  email: string;
  name: string | null;
  timesUsed: number;
  lastUsedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  authSource: "LOCAL" | "MAIL_SERVER";
  avatarUrl: string | null;
  lastLoginAt: string | null;
}

export interface PaginatedMessages<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  categoryCounts?: Record<string, number>;
  unreadCategoryCounts?: Record<string, number>;
}

export interface MailAccount {
  id: string;
  label: string;
  provider: "IMAP" | "GMAIL" | "OUTLOOK" | "YAHOO";
  emailAddress: string;
  isActive: boolean;
  isPrimary: boolean;
  signature: string | null;
  displayName: string | null;
  imapHost: string | null;
  imapPort: number | null;
  imapTls: boolean;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpTls: boolean;
  username: string | null;
  createdAt: string;
}

export interface CreateMailAccountInput {
  label: string;
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  imapTls?: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpTls?: boolean;
  username: string;
  password: string;
}

export interface MailFolder {
  id: string;
  name: string;
  path: string;
  specialUse: string | null;
  color: string | null;
  isCustom: boolean;
  unreadCount: number;
  totalCount: number;
}

export interface MailMessage {
  id: string;
  uid: number;
  messageId: string | null;
  subject: string | null;
  fromAddress: string | null;
  fromName: string | null;
  category: "PRIMARY" | "SOCIAL" | "PROMOTIONS" | "UPDATES" | "FORUMS";
  isRead: boolean;
  isFlagged: boolean;
  hasAttachments: boolean;
  receivedAt: string | null;
}

export interface UnifiedMessage extends MailMessage {
  mailAccount: { id: string; label: string; emailAddress: string };
  folder: { id: string };
}

export interface SendMessageInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text?: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: File[];
}

export interface Addon {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export interface AddonConfig {
  slug: string;
  name: string;
  enabled: boolean;
  clientId: string | null;
  redirectUri: string | null;
  hasClientSecret: boolean;
}

export interface SystemSettingsDto {
  siteName: string;
  logoUrl: string | null;
  logoUrlDark: string | null;
  faviconUrl: string | null;
  defaultLocale: string;
}

export interface MailServerSettingsDto {
  imapHost: string;
  imapPort: number;
  imapTls: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpTls: boolean;
}

export type MailServerSettingsInput = MailServerSettingsDto;
