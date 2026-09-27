// Interfaz común que debe implementar cualquier proveedor de correo:
// el core (IMAP contra el servidor propio del cliente) y cada add-on
// (Gmail, Outlook/Graph, Yahoo) implementan este mismo contrato, para que
// el resto de la app (bandeja, sync, envío) no necesite saber qué proveedor
// hay detrás de una MailAccount.

export interface MailProviderCredentials {
  host?: string;
  port?: number;
  tls?: boolean;
  // Servidores de correo compartidos a veces presentan un certificado TLS
  // mal emparejado con el hostname (frecuente en hosting compartido) — sin
  // esto, ninguna casilla puede loguearse aunque la contraseña sea correcta.
  // No reemplaza arreglar el certificado real del lado del servidor.
  allowInvalidCert?: boolean;
  username?: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface MailFolderDTO {
  path: string;
  name: string;
  specialUse?: '\\Inbox' | '\\Sent' | '\\Drafts' | '\\Trash' | '\\Junk' | '\\Archive';
  unreadCount: number;
  totalCount: number;
}

export interface MailMessageDTO {
  uid: number;
  messageId?: string;
  subject?: string;
  fromAddress?: string;
  fromName?: string;
  toAddresses?: string[];
  ccAddresses?: string[];
  snippet?: string;
  hasAttachments: boolean;
  isRead: boolean;
  isFlagged: boolean;
  receivedAt?: Date;
  sizeBytes?: number;
}

export interface MailAttachmentMeta {
  index: number;
  filename: string;
  contentType: string;
  size: number;
}

export interface MailMessageBody {
  text?: string;
  html?: string;
  to?: string;
  cc?: string;
  attachments?: MailAttachmentMeta[];
}

export interface MailAttachmentContent {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface SendMailInput {
  to: string[];
  cc?: string[];
  bcc?: string[];
  fromName?: string; // nombre a mostrar en el "De" del correo (si no se da, solo la dirección)
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
  inReplyTo?: string;
  references?: string | string[];
}

export interface FetchMessagesOptions {
  folderPath: string;
  limit?: number;
  sinceUid?: number;
  uids?: number[];
}

// Contrato que implementa cada proveedor de correo (core IMAP o add-on).
export interface MailProviderAdapter {
  readonly providerSlug: 'imap' | 'gmail' | 'outlook' | 'yahoo';

  connect(credentials: MailProviderCredentials): Promise<void>;
  disconnect(): Promise<void>;

  sync(): Promise<MailFolderDTO[]>;

  fetchMessages(options: FetchMessagesOptions): Promise<MailMessageDTO[]>;
  fetchMessageBody(folderPath: string, uid: number): Promise<MailMessageBody>;
  fetchAttachments(folderPath: string, uid: number): Promise<MailAttachmentContent[]>;

  send(input: SendMailInput): Promise<{ messageId: string }>;
}
