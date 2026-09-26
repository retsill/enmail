import { Logger } from '@nestjs/common';
import { ImapFlow, type ListResponse } from 'imapflow';
import { createTransport, type Transporter } from 'nodemailer';
import { simpleParser } from 'mailparser';
import type {
  FetchMessagesOptions,
  MailFolderDTO,
  MailMessageBody,
  MailMessageDTO,
  MailProviderAdapter,
  MailProviderCredentials,
  SendMailInput,
} from '@webmail/shared';

// Implementación del core: IMAP/SMTP contra el servidor de correo propio del
// cliente. Cada instancia representa la conexión de UNA MailAccount — no es
// un singleton de Nest, se crea por request/uso (ver MailSyncService).
export class ImapMailProvider implements MailProviderAdapter {
  readonly providerSlug = 'imap' as const;
  private readonly logger = new Logger(ImapMailProvider.name);

  private client?: ImapFlow;
  private transporter?: Transporter;
  private credentials?: MailProviderCredentials;
  private smtpCredentials?: MailProviderCredentials;

  // El IMAP y el SMTP del servidor propio suelen vivir en host/puerto distintos,
  // así que además del connect() del contrato común, exponemos este método
  // específico del core para configurar el transporte de envío.
  configureSmtp(credentials: MailProviderCredentials): void {
    this.smtpCredentials = credentials;
    this.transporter = undefined;
  }

  async connect(credentials: MailProviderCredentials): Promise<void> {
    this.credentials = credentials;
    this.smtpCredentials ??= credentials;

    this.client = new ImapFlow({
      host: credentials.host!,
      port: credentials.port ?? 993,
      secure: credentials.tls ?? true,
      tls: credentials.allowInvalidCert ? { rejectUnauthorized: false } : undefined,
      auth: credentials.accessToken
        ? { user: credentials.username!, accessToken: credentials.accessToken }
        : { user: credentials.username!, pass: credentials.password! },
      logger: false,
    });

    // ImapFlow es un EventEmitter y puede emitir 'error' después de conectar
    // (ej. timeout de socket a mitad de una operación) — sin un listener acá,
    // Node lo re-lanza como excepción no capturada y TUMBA TODO EL PROCESO
    // de la API para todos los usuarios, no solo el de esta conexión.
    this.client.on('error', (err) => {
      this.logger.warn(`Error de conexión IMAP (${credentials.host}): ${String(err)}`);
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    await this.client?.logout();
    this.client = undefined;
  }

  private ensureConnected(): ImapFlow {
    if (!this.client) {
      throw new Error('ImapMailProvider: llama a connect() antes de usarlo');
    }
    return this.client;
  }

  async sync(): Promise<MailFolderDTO[]> {
    const client = this.ensureConnected();
    const mailboxes = await client.list();

    const folders: MailFolderDTO[] = [];
    for (const mailbox of mailboxes as ListResponse[]) {
      if (mailbox.flags?.has('\\Noselect')) continue;

      try {
        const status = await client.status(mailbox.path, { messages: true, unseen: true });
        // "INBOX" es un nombre reservado por el protocolo IMAP (RFC 3501):
        // siempre es la bandeja de entrada exista o no soporte el servidor
        // la extensión SPECIAL-USE para declararlo con \Inbox. Sin este
        // fallback, cuentas de hosting que no anuncian SPECIAL-USE se
        // quedaban sin specialUse en su Inbox y perdían todo lo que depende
        // de eso (tabs de categoría, ícono de carpeta, etc.).
        const specialUse =
          mailbox.path.toUpperCase() === 'INBOX'
            ? '\\Inbox'
            : (mailbox.specialUse as MailFolderDTO['specialUse']);
        folders.push({
          path: mailbox.path,
          name: mailbox.name,
          specialUse,
          unreadCount: status.unseen ?? 0,
          totalCount: status.messages ?? 0,
        });
      } catch {
        // Carpeta no consultable (permisos, IMAP raro del hosting): se omite
        // en vez de tumbar todo el sync.
      }
    }

    return folders;
  }

  async fetchMessages(options: FetchMessagesOptions): Promise<MailMessageDTO[]> {
    const client = this.ensureConnected();
    const mailbox = await client.mailboxOpen(options.folderPath);

    const limit = options.limit ?? 50;
    // Para buzones grandes (miles de mensajes), traer solo los últimos N por
    // número de secuencia en vez de "1:*" — evita timeouts y respuestas 500
    // en cuentas reales de hosting con inboxes de miles de correos.
    const useUid = !!options.sinceUid || !!options.uids;
    let range: string;
    if (options.uids) {
      if (options.uids.length === 0) return [];
      range = options.uids.join(',');
    } else if (options.sinceUid) {
      range = `${options.sinceUid}:*`;
    } else {
      const total = mailbox.exists ?? 0;
      const start = Math.max(1, total - limit + 1);
      range = total > 0 ? `${start}:*` : '1:*';
    }

    const messages = await this.fetchRange(client, range, useUid);

    if (options.uids) return messages;
    return messages.slice(-limit).reverse();
  }

  // Trae una página por número de secuencia IMAP (1 = mensaje más viejo de
  // la carpeta, mailbox.exists = el más nuevo). A diferencia de fetchMessages
  // (pensado para la ventana reciente + no leídos), esto sirve para traer
  // "en vivo" cualquier página de un buzón grande que el cache local no
  // cubre — sin esto, cualquier correo fuera de los últimos ~50 sincronizados
  // queda invisible en la app para siempre.
  async fetchMessagesBySequenceRange(
    folderPath: string,
    startSeq: number,
    endSeq: number,
  ): Promise<MailMessageDTO[]> {
    const client = this.ensureConnected();
    await client.mailboxOpen(folderPath);
    if (startSeq > endSeq || endSeq < 1) return [];
    const messages = await this.fetchRange(client, `${Math.max(1, startSeq)}:${endSeq}`, false);
    return messages.reverse();
  }

  private async fetchRange(client: ImapFlow, range: string, useUid: boolean): Promise<MailMessageDTO[]> {
    const messages: MailMessageDTO[] = [];
    try {
      for await (const message of client.fetch(
        range,
        { envelope: true, flags: true, uid: true, size: true, bodyStructure: true },
        { uid: useUid },
      )) {
        try {
          messages.push({
            uid: message.uid,
            messageId: message.envelope?.messageId ?? undefined,
            subject: message.envelope?.subject ?? undefined,
            fromAddress: message.envelope?.from?.[0]?.address ?? undefined,
            fromName: message.envelope?.from?.[0]?.name ?? undefined,
            toAddresses: message.envelope?.to?.map((a) => a.address).filter((a): a is string => !!a),
            ccAddresses: message.envelope?.cc?.map((a) => a.address).filter((a): a is string => !!a),
            hasAttachments: (message.bodyStructure?.childNodes?.length ?? 0) > 1,
            isRead: message.flags?.has('\\Seen') ?? false,
            isFlagged: message.flags?.has('\\Flagged') ?? false,
            receivedAt: message.envelope?.date ? new Date(message.envelope.date) : undefined,
            sizeBytes: message.size,
          });
        } catch {
          // Un mensaje individual mal formado no debe tumbar el resto del listado.
        }
      }
    } catch {
      // Si el fetch se corta a mitad de camino, devolvemos lo que se alcanzó a leer.
    }
    return messages;
  }

  // UIDs de mensajes no leídos en toda la carpeta (no solo la ventana
  // reciente cacheada) — usado para que ningún correo no leído quede fuera
  // del cache aunque sea viejo y no esté entre los últimos N sincronizados.
  async fetchUnseenUids(folderPath: string): Promise<number[]> {
    const client = this.ensureConnected();
    await client.mailboxOpen(folderPath);
    const result = await client.search({ seen: false }, { uid: true });
    return Array.isArray(result) ? result : [];
  }

  async fetchMessageBody(folderPath: string, uid: number): Promise<MailMessageBody> {
    const client = this.ensureConnected();
    await client.mailboxOpen(folderPath);

    const { content } = await client.download(String(uid), undefined, { uid: true });
    const chunks: Buffer[] = [];
    for await (const chunk of content) {
      chunks.push(chunk as Buffer);
    }

    const parsed = await simpleParser(Buffer.concat(chunks));
    return {
      text: parsed.text,
      html: typeof parsed.html === 'string' ? parsed.html : undefined,
    };
  }

  // Cuota real del buzón que asignó el hosting (RFC 2087 / extensión QUOTA
  // de IMAP) — no todos los servidores la anuncian; si no está, devolvemos
  // null y el frontend simplemente no muestra la barra (nunca un número
  // inventado). ImapFlow ya convierte el valor a bytes internamente (el
  // wire protocol lo manda en KB) — el .d.ts de la librería llama al campo
  // "used" pero el código real (.js) devuelve "usage"; se leen ambos por
  // las dudas en vez de confiar ciegamente en el tipo declarado.
  async getQuota(): Promise<{ usedBytes: number; limitBytes: number } | null> {
    const client = this.ensureConnected();
    try {
      const quota = await client.getQuota();
      if (!quota || !quota.storage) return null;
      const storage = quota.storage;
      const s = storage as { used?: number; usage?: number; limit?: number };
      const usedBytes = s.usage ?? s.used;
      const limitBytes = s.limit;
      if (usedBytes === undefined || limitBytes === undefined) return null;
      return { usedBytes, limitBytes };
    } catch {
      return null;
    }
  }

  async setFlags(
    folderPath: string,
    uid: number,
    flags: { seen?: boolean; flagged?: boolean },
  ): Promise<void> {
    const client = this.ensureConnected();
    await client.mailboxOpen(folderPath);

    const add: string[] = [];
    const remove: string[] = [];
    if (flags.seen === true) add.push('\\Seen');
    if (flags.seen === false) remove.push('\\Seen');
    if (flags.flagged === true) add.push('\\Flagged');
    if (flags.flagged === false) remove.push('\\Flagged');

    if (add.length) await client.messageFlagsAdd(String(uid), add, { uid: true });
    if (remove.length) await client.messageFlagsRemove(String(uid), remove, { uid: true });
  }

  // Igual que setFlags pero para varios UIDs de una sola carpeta en una sola
  // conexión (usado por las acciones en lote de la lista de mensajes).
  async setFlagsForMessages(
    folderPath: string,
    uids: number[],
    flags: { seen?: boolean; flagged?: boolean },
  ): Promise<void> {
    const client = this.ensureConnected();
    await client.mailboxOpen(folderPath);

    const add: string[] = [];
    const remove: string[] = [];
    if (flags.seen === true) add.push('\\Seen');
    if (flags.seen === false) remove.push('\\Seen');
    if (flags.flagged === true) add.push('\\Flagged');
    if (flags.flagged === false) remove.push('\\Flagged');

    const range = uids.join(',');
    if (add.length) await client.messageFlagsAdd(range, add, { uid: true });
    if (remove.length) await client.messageFlagsRemove(range, remove, { uid: true });
  }

  // Devuelve el nuevo UID del mensaje en la carpeta destino cuando el
  // servidor soporta UIDPLUS (la mayoría de hosting con Dovecot/Courier sí).
  // Sin eso no hay forma de saber el UID nuevo sin re-sincronizar.
  async moveMessage(folderPath: string, uid: number, targetFolderPath: string): Promise<number | undefined> {
    const client = this.ensureConnected();
    await client.mailboxOpen(folderPath);
    const result = await client.messageMove(String(uid), targetFolderPath, { uid: true });
    return result ? result.uidMap?.get(uid) : undefined;
  }

  // El servidor suele reubicar la carpeta bajo su namespace personal (p.ej.
  // pedir "Mani Local" termina siendo "INBOX.Mani Local"); hay que guardar el
  // path real que devuelve, no el que pedimos, o luego no la encontramos.
  async createFolder(path: string): Promise<string> {
    const client = this.ensureConnected();
    const result = await client.mailboxCreate(path);
    return result.path;
  }

  async renameFolder(oldPath: string, newPath: string): Promise<string> {
    const client = this.ensureConnected();
    const result = await client.mailboxRename(oldPath, newPath);
    return result.newPath;
  }

  async deleteFolder(path: string): Promise<void> {
    const client = this.ensureConnected();
    await client.mailboxDelete(path);
  }

  // Borra de verdad todos los mensajes de una carpeta (usado por "Vaciar
  // papelera"/"Vaciar spam") — no los mueve, los elimina del servidor.
  async emptyFolder(path: string): Promise<void> {
    const client = this.ensureConnected();
    await client.mailboxOpen(path);
    await client.messageDelete('1:*');
  }

  // Guarda una copia del correo enviado en la carpeta Sent — el servidor SMTP
  // no lo hace solo, hay que subirla nosotros vía IMAP (igual que Roundcube).
  // Devuelve el UID asignado por el servidor (vía UIDPLUS) para poder
  // cachear el mensaje enviado sin esperar a la próxima sincronización.
  async appendMessage(path: string, raw: Buffer, flags: string[] = ['\\Seen']): Promise<number | undefined> {
    const client = this.ensureConnected();
    const result = await client.append(path, raw, flags);
    return result ? result.uid : undefined;
  }

  // Mueve varios mensajes de la MISMA carpeta origen en una sola conexión
  // (bulkMove por HTTP anterior abría una conexión IMAP nueva por cada
  // mensaje — muy lento con selecciones grandes). Devuelve el mapeo de
  // uid viejo -> uid nuevo cuando el servidor lo confirma (UIDPLUS).
  async moveMessages(
    folderPath: string,
    uids: number[],
    targetFolderPath: string,
  ): Promise<Map<number, number> | undefined> {
    const client = this.ensureConnected();
    await client.mailboxOpen(folderPath);
    const result = await client.messageMove(uids.join(','), targetFolderPath, { uid: true });
    return result ? result.uidMap : undefined;
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const smtp = this.smtpCredentials;
      if (!smtp) {
        throw new Error('ImapMailProvider: llama a connect() o configureSmtp() antes de enviar correo');
      }
      this.transporter = createTransport({
        host: smtp.host,
        port: smtp.port ?? 587,
        secure: smtp.tls ?? false,
        tls: smtp.allowInvalidCert ? { rejectUnauthorized: false } : undefined,
        auth: smtp.accessToken
          ? { type: 'OAuth2', user: smtp.username, accessToken: smtp.accessToken }
          : { user: smtp.username, pass: smtp.password },
      });
    }
    return this.transporter;
  }

  // Construye el mensaje MIME crudo sin enviarlo — lo comparten send() (para
  // subir la copia a Sent) y saveDraft() (que nunca pasa por SMTP).
  private buildStreamMessage(input: Partial<SendMailInput>) {
    const address = this.smtpCredentials?.username;
    const mailOptions = {
      from: input.fromName ? { name: input.fromName, address: address ?? '' } : address,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
      inReplyTo: input.inReplyTo,
      references: input.references,
    };
    const streamTransport = createTransport({ streamTransport: true, newline: 'unix', buffer: true });
    return streamTransport.sendMail(mailOptions);
  }

  async send(input: SendMailInput): Promise<{ messageId: string; raw: Buffer }> {
    // Construimos el mensaje crudo primero (sin enviarlo) para poder subir
    // exactamente la misma copia a la carpeta Sent después — el servidor SMTP
    // no guarda copia por su cuenta, hay que hacerlo nosotros vía IMAP.
    const built = await this.buildStreamMessage(input);
    const raw = built.message as Buffer;

    const transporter = this.getTransporter();
    // nodemailer tipa el envelope de salida (MimeNodeEnvelope, from: string |
    // false) distinto del que acepta sendMail (MimeNodeEnvelopeInput) — mismo
    // comportamiento en runtime, solo hace falta rearmarlo con el tipo que espera.
    const info = await transporter.sendMail({
      raw,
      envelope: { from: built.envelope.from || undefined, to: built.envelope.to },
    });

    return { messageId: info.messageId, raw };
  }

  // Un borrador puede no tener destinatario/asunto todavía — nunca se manda
  // por SMTP, solo se sube crudo a la carpeta Drafts vía IMAP.
  async buildDraftRaw(input: Partial<SendMailInput>): Promise<Buffer> {
    const built = await this.buildStreamMessage(input);
    return built.message as Buffer;
  }
}
