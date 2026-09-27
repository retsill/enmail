import { BadGatewayException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ZipArchive } from 'archiver';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { MailAccountsService } from '../mail-accounts/mail-accounts.service.js';
import { ImapMailProvider } from './imap-mail-provider.js';
import { OAuthTokenService } from '../integrations/oauth-token.service.js';
import { getOAuthProvider } from '../integrations/oauth-providers.js';
import { ContactsService } from '../contacts/contacts.service.js';
import { classifyMessage } from './message-classifier.js';

// El servidor puede reportar la carpeta como inexistente (se borró/renombró
// desde otro cliente, fuera de esta app) mientras nuestro cache local sigue
// creyendo que existe. En vez de tumbar la petición con un 500, lo tratamos
// como "ya no está" y limpiamos el cache.
function isMissingMailboxError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { serverResponseCode?: string; responseText?: string; message?: string };
  if (err.serverResponseCode === 'NONEXISTENT') return true;
  const text = `${err.responseText ?? ''} ${err.message ?? ''}`.toLowerCase();
  return text.includes("mailbox doesn't exist") || text.includes('mailbox does not exist');
}

@Injectable()
export class MailSyncService {
  private readonly logger = new Logger(MailSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailAccounts: MailAccountsService,
    private readonly oauthTokens: OAuthTokenService,
    private readonly contacts: ContactsService,
  ) {}

  // Sin esto, cualquier falla al conectar (credenciales OAuth con el scope
  // mal otorgado, host caído, etc.) subía sin capturar hasta el controller y
  // Nest la devolvía como un 500 "Internal server error" genérico — nada
  // que el usuario o el admin pudieran usar para entender qué pasó.
  private async connectProvider(provider: ImapMailProvider, credentials: Parameters<ImapMailProvider['connect']>[0]) {
    try {
      await provider.connect(credentials);
    } catch (error) {
      const err = error as { authenticationFailed?: boolean; oauthError?: { status?: string }; code?: string };
      if (err.authenticationFailed) {
        const reason = err.oauthError?.status
          ? ` (${err.oauthError.status} — revisá que la cuenta esté autorizada/en la lista de test users del conector)`
          : '';
        throw new BadGatewayException(`No se pudo autenticar contra ${credentials.host}${reason}`);
      }
      throw new BadGatewayException(
        `No se pudo conectar a ${credentials.host} (${err.code ?? 'error desconocido'})`,
      );
    }
  }

  private async buildProvider(userId: string, mailAccountId: string) {
    const account = await this.mailAccounts.getWithCredentials(userId, mailAccountId);
    const provider = new ImapMailProvider();

    if (account.provider === 'IMAP') {
      await this.connectProvider(provider, {
        host: account.imapHost!,
        port: account.imapPort!,
        tls: account.imapTls,
        allowInvalidCert: account.allowInsecureTls,
        username: account.username!,
        password: account.password,
      });

      provider.configureSmtp({
        host: account.smtpHost!,
        port: account.smtpPort!,
        tls: account.smtpTls,
        allowInvalidCert: account.allowInsecureTls,
        username: account.username!,
        password: account.password,
      });
    } else {
      // Gmail/Outlook: el "password" guardado es en realidad
      // `{"refreshToken": "..."}` — lo cambiamos por un access token fresco
      // y nos conectamos por IMAP/SMTP con XOAUTH2 (mismo ImapMailProvider).
      const slug = account.provider.toLowerCase();
      const oauthConfig = getOAuthProvider(slug);
      if (!oauthConfig) {
        throw new Error(`Proveedor OAuth sin configurar: ${account.provider}`);
      }

      const { refreshToken } = JSON.parse(account.password) as { refreshToken: string };
      const tokens = await this.oauthTokens.refreshAccessToken(slug, refreshToken);

      if (tokens.refresh_token && tokens.refresh_token !== refreshToken) {
        await this.mailAccounts.upsertOAuthAccount(
          userId,
          account.provider as 'GMAIL' | 'OUTLOOK',
          account.emailAddress,
          tokens.refresh_token,
        );
      }

      await this.connectProvider(provider, {
        host: oauthConfig.imapHost,
        port: oauthConfig.imapPort,
        tls: oauthConfig.imapTls,
        username: account.username!,
        accessToken: tokens.access_token,
      });

      provider.configureSmtp({
        host: oauthConfig.smtpHost,
        port: oauthConfig.smtpPort,
        tls: oauthConfig.smtpTls,
        username: account.username!,
        accessToken: tokens.access_token,
      });
    }

    return { provider, account };
  }

  // Sincroniza carpetas y los últimos mensajes de cada una hacia el cache local.
  async syncAccount(userId: string, mailAccountId: string) {
    const { provider } = await this.buildProvider(userId, mailAccountId);

    try {
      const folders = await provider.sync();
      let syncedFolders = 0;

      for (const folder of folders) {
        try {
          const savedFolder = await this.prisma.mailFolder.upsert({
            where: { mailAccountId_path: { mailAccountId, path: folder.path } },
            create: {
              mailAccountId,
              name: folder.name,
              path: folder.path,
              specialUse: folder.specialUse,
              unreadCount: folder.unreadCount,
              totalCount: folder.totalCount,
            },
            update: {
              name: folder.name,
              specialUse: folder.specialUse,
              unreadCount: folder.unreadCount,
              totalCount: folder.totalCount,
            },
          });

          const messages = await provider.fetchMessages({ folderPath: folder.path, limit: 50 });
          const seenUids = new Set(messages.map((m) => m.uid));

          for (const message of messages) {
            await this.cacheMessage(mailAccountId, savedFolder.id, folder.path, message);
          }

          // En bandejas grandes los no leídos pueden quedar fuera de la
          // ventana de los últimos 50: sin esto el usuario nunca los ve en
          // la lista y el contador de no leídos de la carpeta jamás baja,
          // aunque marque como leído todo lo que sí puede ver.
          if (folder.unreadCount > 0) {
            try {
              const unseenUids = await provider.fetchUnseenUids(folder.path);
              const missingUids = unseenUids.filter((uid) => !seenUids.has(uid)).slice(0, 300);
              if (missingUids.length > 0) {
                const unseenMessages = await provider.fetchMessages({
                  folderPath: folder.path,
                  uids: missingUids,
                });
                for (const message of unseenMessages) {
                  await this.cacheMessage(mailAccountId, savedFolder.id, folder.path, message);
                }
              }
            } catch (error) {
              this.logger.warn(`No se pudieron traer los no leídos completos de ${folder.path}: ${String(error)}`);
            }
          }
          syncedFolders += 1;
        } catch (error) {
          // Una carpeta problemática (permisos, encoding raro del hosting) no
          // debe tumbar la sincronización completa de la cuenta.
          this.logger.warn(`No se pudo sincronizar la carpeta ${folder.path}: ${String(error)}`);
        }
      }

      return { syncedFolders };
    } finally {
      await provider.disconnect();
    }
  }

  private async cacheMessage(
    mailAccountId: string,
    folderId: string,
    folderPath: string,
    message: Awaited<ReturnType<ImapMailProvider['fetchMessages']>>[number],
  ) {
    try {
      await this.prisma.mailMessage.upsert({
        where: { folderId_uid: { folderId, uid: message.uid } },
        create: {
          mailAccountId,
          folderId,
          uid: message.uid,
          messageId: message.messageId,
          subject: message.subject,
          fromAddress: message.fromAddress,
          fromName: message.fromName,
          toAddresses: message.toAddresses,
          ccAddresses: message.ccAddresses,
          hasAttachments: message.hasAttachments,
          category: classifyMessage(message),
          isRead: message.isRead,
          isFlagged: message.isFlagged,
          receivedAt: message.receivedAt,
          sizeBytes: message.sizeBytes,
        },
        update: {
          isRead: message.isRead,
          isFlagged: message.isFlagged,
          // Recalcular también en el update (no solo al crear): si no, un
          // mensaje cacheado antes de un ajuste al heurístico de categorías
          // se queda con la categoría vieja para siempre y nunca se corrige
          // solo con volver a sincronizar.
          category: classifyMessage(message),
        },
      });
    } catch (error) {
      // Un mensaje puntual con datos fuera de rango (headers gigantes,
      // encoding raro) no debe frenar el resto de la carpeta.
      this.logger.warn(`No se pudo cachear el mensaje uid=${message.uid} de ${folderPath}: ${String(error)}`);
    }
  }

  // Lista paginada de una carpeta. El cache local del sync solo cubre los
  // últimos ~50 mensajes + no leídos, así que en buzones grandes (cientos o
  // miles de correos) casi todo quedaba fuera y era invisible en la app aun
  // existiendo de verdad en el servidor. Si la página pedida no está cubierta
  // por lo cacheado, la traemos en vivo por número de secuencia IMAP,
  // cacheándola antes de responder — así la paginación sí recorre el buzón
  // completo, no solo lo que el sync alcanzó a bajar.
  // Cuenta mensajes por categoría (Principal/Social/Promociones/...) sobre
  // TODO lo cacheado que matchea el where, no solo la página visible — si no,
  // las pestañas dependían de qué 25-50 mensajes tocara cargar en ese momento
  // y desaparecían apenas esa página resultaba ser de una sola categoría.
  private async categoryCounts(where: Prisma.MailMessageWhereInput): Promise<Record<string, number>> {
    const rows = await this.prisma.mailMessage.groupBy({ by: ['category'], where, _count: { _all: true } });
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row.category] = row._count._all;
    return counts;
  }

  async getFolderMessages(
    userId: string,
    mailAccountId: string,
    folderId: string,
    page: number,
    pageSize: number,
    category?: string,
  ) {
    const folder = await this.prisma.mailFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Carpeta no encontrada');

    const skip = (page - 1) * pageSize;
    // Dos conteos con propósitos distintos: `categoryCounts` (todos los
    // mensajes) decide qué pestañas existen y el total al paginar una
    // categoría — no debe desaparecer una pestaña solo porque ya se leyó
    // todo. `unreadCategoryCounts` (solo no leídos) es lo que se muestra
    // como número en cada pestaña, al estilo Gmail.
    const [categoryCounts, unreadCategoryCounts] = await Promise.all([
      this.categoryCounts({ folderId }),
      this.categoryCounts({ folderId, isRead: false }),
    ]);

    // Con una pestaña de categoría activa, no se puede pedirle a IMAP "solo
    // Principal": la categoría es nuestra (heurística local), no existe en
    // el servidor. Así que filtramos sobre lo cacheado y, si no alcanza,
    // traemos UN bloque más del buzón en general (sin filtrar — no sabemos
    // la categoría hasta clasificar) y lo cacheamos. Un solo intento, no un
    // bucle: una categoría con pocos mensajes (p.ej. Promociones: 7) nunca
    // "llena" una página de 25, así que reintentar varias veces en la misma
    // petición solo agregaba varios round-trips a IMAP seguidos (~15s) sin
    // encontrar más — mejor un intento acotado por clic, que además va
    // haciendo crecer el cache general con cada visita a la pestaña.
    if (category) {
      const where: Prisma.MailMessageWhereInput = { folderId, category: category as never };
      let cachedForCategory = await this.prisma.mailMessage.count({ where });
      const generalCachedCount = await this.prisma.mailMessage.count({ where: { folderId } });

      if (skip + pageSize > cachedForCategory && generalCachedCount < folder.totalCount) {
        try {
          const { provider } = await this.buildProvider(userId, mailAccountId);
          try {
            const chunk = Math.max(pageSize * 2, 100);
            const endSeq = Math.max(0, folder.totalCount - generalCachedCount);
            const startSeq = Math.max(1, endSeq - chunk + 1);
            if (endSeq >= 1) {
              const fetched = await provider.fetchMessagesBySequenceRange(folder.path, startSeq, endSeq);
              for (const message of fetched) {
                await this.cacheMessage(mailAccountId, folderId, folder.path, message);
              }
            }
          } finally {
            await provider.disconnect();
          }
        } catch (error) {
          this.logger.warn(`No se pudo traer en vivo más mensajes de ${folder.path}: ${String(error)}`);
        }
        cachedForCategory = await this.prisma.mailMessage.count({ where });
      }

      const [finalCategoryCounts, finalUnreadCategoryCounts] = await Promise.all([
        this.categoryCounts({ folderId }),
        this.categoryCounts({ folderId, isRead: false }),
      ]);
      const items = await this.prisma.mailMessage.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip,
        take: pageSize,
      });
      return {
        items,
        total: finalCategoryCounts[category] ?? cachedForCategory,
        page,
        pageSize,
        categoryCounts: finalCategoryCounts,
        unreadCategoryCounts: finalUnreadCategoryCounts,
      };
    }

    const cachedCount = await this.prisma.mailMessage.count({ where: { folderId } });
    const total = Math.max(folder.totalCount, cachedCount);

    // Camino rápido: la página pedida cae dentro del prefijo ya cacheado
    // (los últimos N que trajo el sync) — el cache ahí sí es contiguo, así
    // que un skip/take normal da el resultado correcto.
    if (skip + pageSize <= cachedCount) {
      const items = await this.prisma.mailMessage.findMany({
        where: { folderId },
        orderBy: { receivedAt: 'desc' },
        skip,
        take: pageSize,
      });
      return { items, total, page, pageSize, categoryCounts, unreadCategoryCounts };
    }

    // Página no cubierta por el prefijo cacheado: el cache es disperso más
    // allá de ahí (top N + no leídos sueltos de cualquier parte del buzón),
    // así que un skip/take contra la tabla NO corresponde a la posición real
    // en el servidor. En vez de eso, traemos ese rango exacto por número de
    // secuencia IMAP, lo cacheamos, y devolvemos justo esos mensajes por UID
    // — no por skip/take, que asumiría una continuidad que no existe.
    if (folder.totalCount > 0) {
      try {
        const { provider } = await this.buildProvider(userId, mailAccountId);
        let fetchedUids: number[] = [];
        try {
          const endSeq = Math.max(0, folder.totalCount - skip);
          const startSeq = Math.max(1, endSeq - pageSize + 1);
          if (endSeq >= 1) {
            const fetched = await provider.fetchMessagesBySequenceRange(folder.path, startSeq, endSeq);
            fetchedUids = fetched.map((m) => m.uid);
            for (const message of fetched) {
              await this.cacheMessage(mailAccountId, folderId, folder.path, message);
            }
          }
        } finally {
          await provider.disconnect();
        }
        const items = await this.prisma.mailMessage.findMany({
          where: { folderId, uid: { in: fetchedUids } },
          orderBy: { receivedAt: 'desc' },
        });
        return { items, total, page, pageSize, categoryCounts, unreadCategoryCounts };
      } catch (error) {
        this.logger.warn(`No se pudo traer en vivo la página ${page} de ${folder.path}: ${String(error)}`);
      }
    }

    // Si el fetch en vivo falló (servidor caído, etc.), mejor mostrar algo
    // del cache disperso que un error — aunque la posición no sea exacta.
    const items = await this.prisma.mailMessage.findMany({
      where: { folderId },
      orderBy: { receivedAt: 'desc' },
      skip,
      take: pageSize,
    });
    return { items, total, page, pageSize, categoryCounts, unreadCategoryCounts };
  }

  async sendMessage(
    userId: string,
    mailAccountId: string,
    input: Parameters<ImapMailProvider['send']>[0],
  ) {
    const { provider, account } = await this.buildProvider(userId, mailAccountId);
    try {
      const result = await provider.send({ ...input, fromName: account.displayName ?? undefined });

      // El SMTP no guarda copia por su cuenta: la subimos nosotros a Sent
      // (igual que hace cualquier cliente de correo real). Si esto falla no
      // tumbamos el envío — el correo ya salió — solo se pierde la copia.
      try {
        const sentFolder = await this.prisma.mailFolder.findFirst({
          where: { mailAccountId, specialUse: '\\Sent' },
        });
        if (sentFolder) {
          const uid = await provider.appendMessage(sentFolder.path, result.raw, ['\\Seen']);
          await this.adjustFolderCounts(sentFolder.id, { total: 1 });

          // Con UIDPLUS cacheamos el mensaje ya mismo para que aparezca en
          // Enviados sin esperar a la próxima sincronización manual.
          if (uid !== undefined) {
            try {
              const [sent] = await provider.fetchMessages({
                folderPath: sentFolder.path,
                sinceUid: uid,
                limit: 1,
              });
              if (sent) {
                await this.prisma.mailMessage.upsert({
                  where: { folderId_uid: { folderId: sentFolder.id, uid: sent.uid } },
                  create: {
                    mailAccountId,
                    folderId: sentFolder.id,
                    uid: sent.uid,
                    messageId: sent.messageId,
                    subject: sent.subject,
                    fromAddress: sent.fromAddress,
                    fromName: sent.fromName,
                    toAddresses: sent.toAddresses,
                    ccAddresses: sent.ccAddresses,
                    hasAttachments: sent.hasAttachments,
                    category: classifyMessage(sent),
                    isRead: sent.isRead,
                    isFlagged: sent.isFlagged,
                    receivedAt: sent.receivedAt,
                    sizeBytes: sent.sizeBytes,
                  },
                  update: {
                    isRead: sent.isRead,
                    isFlagged: sent.isFlagged,
                  },
                });
              }
            } catch (error) {
              this.logger.warn(`No se pudo cachear el mensaje enviado uid=${uid}: ${String(error)}`);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`No se pudo guardar copia en Sent: ${String(error)}`);
      }

      // Se guardan como contacto los destinatarios de un envío exitoso, para
      // sugerirlos la próxima vez que se escriba a esa dirección.
      const recipients = [...input.to, ...(input.cc ?? []), ...(input.bcc ?? [])].map((email) => ({ email }));
      this.contacts.recordContacts(userId, recipients).catch((error) => {
        this.logger.warn(`No se pudieron guardar los contactos del envío: ${String(error)}`);
      });

      return { messageId: result.messageId };
    } finally {
      await provider.disconnect();
    }
  }

  // Se llama al cerrar "Redactar" sin enviar (con contenido real de por
  // medio) — sube el mensaje crudo a la carpeta Drafts vía IMAP, igual que
  // hace cualquier cliente de correo real al descartar un borrador.
  async saveDraft(
    userId: string,
    mailAccountId: string,
    input: { to?: string[]; cc?: string[]; bcc?: string[]; subject?: string; html?: string; text?: string },
  ) {
    const { provider, account } = await this.buildProvider(userId, mailAccountId);
    try {
      const draftsFolder = await this.prisma.mailFolder.findFirst({
        where: { mailAccountId, specialUse: '\\Drafts' },
      });
      if (!draftsFolder) return null;

      const raw = await provider.buildDraftRaw({ ...input, fromName: account.displayName ?? undefined });
      const uid = await provider.appendMessage(draftsFolder.path, raw, ['\\Seen', '\\Draft']);
      await this.adjustFolderCounts(draftsFolder.id, { total: 1 });

      if (uid !== undefined) {
        try {
          const [draft] = await provider.fetchMessages({ folderPath: draftsFolder.path, sinceUid: uid, limit: 1 });
          if (draft) {
            await this.prisma.mailMessage.upsert({
              where: { folderId_uid: { folderId: draftsFolder.id, uid: draft.uid } },
              create: {
                mailAccountId,
                folderId: draftsFolder.id,
                uid: draft.uid,
                messageId: draft.messageId,
                subject: draft.subject,
                fromAddress: draft.fromAddress,
                fromName: draft.fromName,
                toAddresses: draft.toAddresses,
                ccAddresses: draft.ccAddresses,
                hasAttachments: draft.hasAttachments,
                category: classifyMessage(draft),
                isRead: draft.isRead,
                isFlagged: draft.isFlagged,
                receivedAt: draft.receivedAt,
                sizeBytes: draft.sizeBytes,
              },
              update: {
                isRead: draft.isRead,
                isFlagged: draft.isFlagged,
              },
            });
          }
        } catch (error) {
          this.logger.warn(`No se pudo cachear el borrador uid=${uid}: ${String(error)}`);
        }
      }

      return { uid, folderId: draftsFolder.id };
    } finally {
      await provider.disconnect();
    }
  }

  async fetchMessageBody(userId: string, mailAccountId: string, folderPath: string, uid: number) {
    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      return await provider.fetchMessageBody(folderPath, uid);
    } finally {
      await provider.disconnect();
    }
  }

  async fetchAttachment(
    userId: string,
    mailAccountId: string,
    folderPath: string,
    uid: number,
    index: number,
  ) {
    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      const attachments = await provider.fetchAttachments(folderPath, uid);
      const attachment = attachments[index];
      if (!attachment) throw new NotFoundException('Adjunto no encontrado');
      return attachment;
    } finally {
      await provider.disconnect();
    }
  }

  async fetchAttachmentsZip(userId: string, mailAccountId: string, folderPath: string, uid: number) {
    const { provider } = await this.buildProvider(userId, mailAccountId);
    let attachments;
    try {
      attachments = await provider.fetchAttachments(folderPath, uid);
    } finally {
      await provider.disconnect();
    }
    if (attachments.length === 0) throw new NotFoundException('El mensaje no tiene adjuntos');

    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    // Nombres repetidos (ej. dos "imagen.png" en el mismo correo) pisarían
    // una entrada del zip a la otra — se numeran para que ninguna se pierda.
    const usedNames = new Set<string>();
    for (const attachment of attachments) {
      let name = attachment.filename;
      let suffix = 1;
      while (usedNames.has(name)) {
        const dot = attachment.filename.lastIndexOf('.');
        name =
          dot > 0
            ? `${attachment.filename.slice(0, dot)} (${suffix})${attachment.filename.slice(dot)}`
            : `${attachment.filename} (${suffix})`;
        suffix += 1;
      }
      usedNames.add(name);
      archive.append(attachment.content, { name });
    }
    const done = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });
    await archive.finalize();
    return done;
  }

  async getQuota(userId: string, mailAccountId: string) {
    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      return await provider.getQuota();
    } finally {
      await provider.disconnect();
    }
  }

  async setMessageFlags(
    userId: string,
    mailAccountId: string,
    messageDbId: string,
    flags: { isRead?: boolean; isFlagged?: boolean },
  ) {
    const message = await this.prisma.mailMessage.findUnique({
      where: { id: messageDbId },
      include: { folder: true },
    });
    if (!message) {
      throw new NotFoundException('El mensaje ya no está disponible (puede que se haya movido o borrado)');
    }

    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      await provider.setFlags(message.folder.path, message.uid, {
        seen: flags.isRead,
        flagged: flags.isFlagged,
      });
    } finally {
      await provider.disconnect();
    }

    const updated = await this.prisma.mailMessage.update({
      where: { id: messageDbId },
      data: {
        isRead: flags.isRead ?? message.isRead,
        isFlagged: flags.isFlagged ?? message.isFlagged,
      },
    });

    if (flags.isRead !== undefined && flags.isRead !== message.isRead) {
      // Se volvió leído → baja el contador de no leídos; se volvió no
      // leído → sube. El total de la carpeta no cambia.
      await this.adjustFolderCounts(message.folderId, { unread: flags.isRead ? -1 : 1 });
    }

    return updated;
  }

  async bulkSetMessageFlags(
    userId: string,
    mailAccountId: string,
    messageDbIds: string[],
    flags: { isRead?: boolean; isFlagged?: boolean },
  ) {
    const messages = await this.prisma.mailMessage.findMany({
      where: { id: { in: messageDbIds } },
      include: { folder: true },
    });
    if (messages.length === 0) return;

    const byFolder = new Map<string, typeof messages>();
    for (const message of messages) {
      byFolder.set(message.folderId, [...(byFolder.get(message.folderId) ?? []), message]);
    }

    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      for (const [folderId, group] of byFolder) {
        await provider.setFlagsForMessages(
          group[0].folder.path,
          group.map((m) => m.uid),
          { seen: flags.isRead, flagged: flags.isFlagged },
        );

        await this.prisma.mailMessage.updateMany({
          where: { id: { in: group.map((m) => m.id) } },
          data: {
            ...(flags.isRead !== undefined ? { isRead: flags.isRead } : {}),
            ...(flags.isFlagged !== undefined ? { isFlagged: flags.isFlagged } : {}),
          },
        });

        if (flags.isRead !== undefined) {
          const changed = group.filter((m) => m.isRead !== flags.isRead).length;
          if (changed > 0) {
            await this.adjustFolderCounts(folderId, { unread: flags.isRead ? -changed : changed });
          }
        }
      }
    } finally {
      await provider.disconnect();
    }
  }

  // Mueve un mensaje a otra carpeta (usado para borrar → Trash, marcar spam →
  // Junk, o arrastrar y soltar entre carpetas). Actualiza el cache local.
  // Idempotente: si el mensaje ya no está en cache (p.ej. se movió/borró en
  // un click anterior), no truena — no hay nada que hacer.
  async moveMessage(userId: string, mailAccountId: string, messageDbId: string, targetFolderId: string) {
    const [message, targetFolder] = await Promise.all([
      this.prisma.mailMessage.findUnique({ where: { id: messageDbId }, include: { folder: true } }),
      this.prisma.mailFolder.findUnique({ where: { id: targetFolderId } }),
    ]);

    if (!message) {
      this.logger.warn(`moveMessage: mensaje ${messageDbId} ya no existe en cache, se ignora`);
      return;
    }
    if (!targetFolder) {
      throw new NotFoundException('Carpeta destino no encontrada');
    }
    if (message.folderId === targetFolder.id) {
      return; // ya está ahí
    }

    const sourceFolderId = message.folderId;
    const { provider } = await this.buildProvider(userId, mailAccountId);
    let newUid: number | undefined;
    try {
      newUid = await provider.moveMessage(message.folder.path, message.uid, targetFolder.path);
    } catch (error) {
      if (isMissingMailboxError(error)) {
        // La carpeta origen ya no existe en el servidor: el mensaje es un
        // fantasma en nuestro cache, lo limpiamos en vez de dar 500.
        this.logger.warn(`Carpeta ${message.folder.path} ya no existe en el servidor, limpiando mensaje en cache: ${String(error)}`);
        await this.prisma.mailMessage.delete({ where: { id: messageDbId } }).catch(() => undefined);
        await this.adjustFolderCounts(sourceFolderId, { total: -1, unread: message.isRead ? 0 : -1 });
        return;
      }
      throw error;
    } finally {
      await provider.disconnect();
    }

    if (newUid !== undefined) {
      // El servidor confirmó el UID nuevo (UIDPLUS): movemos el registro de
      // caché en el momento, así aparece de inmediato en la carpeta destino
      // (sin esto había que esperar a un sync para verlo ahí).
      await this.prisma.mailMessage.delete({ where: { id: messageDbId } }).catch(() => undefined);
      await this.prisma.mailMessage
        .upsert({
          where: { folderId_uid: { folderId: targetFolder.id, uid: newUid } },
          create: {
            mailAccountId,
            folderId: targetFolder.id,
            uid: newUid,
            messageId: message.messageId,
            subject: message.subject,
            fromAddress: message.fromAddress,
            fromName: message.fromName,
            toAddresses: message.toAddresses as never,
            ccAddresses: message.ccAddresses as never,
            hasAttachments: message.hasAttachments,
            category: message.category,
            isRead: message.isRead,
            isFlagged: message.isFlagged,
            receivedAt: message.receivedAt,
            sizeBytes: message.sizeBytes,
          },
          update: {},
        })
        .catch(() => undefined);
    } else {
      // Sin UIDPLUS no hay forma confiable de saber el UID nuevo: se borra
      // del cache y reaparecerá en la carpeta destino en el próximo sync.
      await this.prisma.mailMessage.delete({ where: { id: messageDbId } }).catch(() => undefined);
    }

    // El mensaje sale de origen y entra a destino: ajustamos ambos contadores
    // en 1 (no recalculamos desde el cache local, que solo guarda los últimos
    // ~50 mensajes por carpeta y daría un total falso muy por debajo del real).
    const wasUnread = !message.isRead;
    await Promise.all([
      this.adjustFolderCounts(sourceFolderId, { total: -1, unread: wasUnread ? -1 : 0 }),
      this.adjustFolderCounts(targetFolder.id, { total: 1, unread: wasUnread ? 1 : 0 }),
    ]);
  }

  // Los contadores de carpeta (unreadCount/totalCount) se llenan en el sync
  // desde IMAP STATUS (total real del servidor). Borrar/mover/marcar ya no
  // dispara un re-sync completo, así que los ajustamos incrementalmente en
  // vez de recalcularlos desde el cache local (que solo tiene una porción
  // reciente de los mensajes, no el total real).
  private async adjustFolderCounts(folderId: string, delta: { total?: number; unread?: number }) {
    const data: { totalCount?: { increment: number }; unreadCount?: { increment: number } } = {};
    if (delta.total) data.totalCount = { increment: delta.total };
    if (delta.unread) data.unreadCount = { increment: delta.unread };
    if (Object.keys(data).length === 0) return;

    await this.prisma.mailFolder.update({ where: { id: folderId }, data }).catch(() => undefined);
    // Nunca negativo (por si el cache ya estaba desfasado del servidor).
    const folder = await this.prisma.mailFolder.findUnique({ where: { id: folderId } });
    if (folder && (folder.totalCount < 0 || folder.unreadCount < 0)) {
      await this.prisma.mailFolder
        .update({
          where: { id: folderId },
          data: { totalCount: Math.max(folder.totalCount, 0), unreadCount: Math.max(folder.unreadCount, 0) },
        })
        .catch(() => undefined);
    }
  }

  // Versión en lote de moveMessage: comparte UNA sola conexión IMAP por
  // carpeta de origen en vez de abrir una conexión nueva por cada mensaje
  // (eso hacía que borrar/mover selecciones grandes se sintiera "colgado").
  async bulkMoveMessages(
    userId: string,
    mailAccountId: string,
    messageDbIds: string[],
    targetFolderId: string,
  ) {
    const [messages, targetFolder] = await Promise.all([
      this.prisma.mailMessage.findMany({ where: { id: { in: messageDbIds } }, include: { folder: true } }),
      this.prisma.mailFolder.findUnique({ where: { id: targetFolderId } }),
    ]);
    if (!targetFolder || messages.length === 0) return;

    const byFolder = new Map<string, typeof messages>();
    for (const message of messages) {
      if (message.folderId === targetFolder.id) continue;
      byFolder.set(message.folderId, [...(byFolder.get(message.folderId) ?? []), message]);
    }

    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      for (const [sourceFolderId, group] of byFolder) {
        const sourcePath = group[0].folder.path;
        let uidMap: Map<number, number> | undefined;
        try {
          uidMap = await provider.moveMessages(
            sourcePath,
            group.map((m) => m.uid),
            targetFolder.path,
          );
        } catch (error) {
          if (isMissingMailboxError(error)) {
            // Esta carpeta ya no existe en el servidor: limpiamos sus
            // mensajes fantasma y seguimos con el resto de los grupos.
            this.logger.warn(`Carpeta ${sourcePath} ya no existe en el servidor, limpiando ${group.length} mensaje(s) en cache: ${String(error)}`);
            let removedUnread = 0;
            for (const message of group) {
              await this.prisma.mailMessage.delete({ where: { id: message.id } }).catch(() => undefined);
              if (!message.isRead) removedUnread += 1;
            }
            await this.adjustFolderCounts(sourceFolderId, { total: -group.length, unread: -removedUnread });
            continue;
          }
          throw error;
        }

        let movedTotal = 0;
        let movedUnread = 0;
        for (const message of group) {
          const newUid = uidMap?.get(message.uid);
          await this.prisma.mailMessage.delete({ where: { id: message.id } }).catch(() => undefined);
          if (newUid !== undefined) {
            await this.prisma.mailMessage
              .upsert({
                where: { folderId_uid: { folderId: targetFolder.id, uid: newUid } },
                create: {
                  mailAccountId,
                  folderId: targetFolder.id,
                  uid: newUid,
                  messageId: message.messageId,
                  subject: message.subject,
                  fromAddress: message.fromAddress,
                  fromName: message.fromName,
                  toAddresses: message.toAddresses as never,
                  ccAddresses: message.ccAddresses as never,
                  hasAttachments: message.hasAttachments,
                  category: message.category,
                  isRead: message.isRead,
                  isFlagged: message.isFlagged,
                  receivedAt: message.receivedAt,
                  sizeBytes: message.sizeBytes,
                },
                update: {},
              })
              .catch(() => undefined);
          }
          movedTotal += 1;
          if (!message.isRead) movedUnread += 1;
        }

        await Promise.all([
          this.adjustFolderCounts(sourceFolderId, { total: -movedTotal, unread: -movedUnread }),
          this.adjustFolderCounts(targetFolder.id, { total: movedTotal, unread: movedUnread }),
        ]);
      }
    } finally {
      await provider.disconnect();
    }
  }

  async bulkDeleteMessages(userId: string, mailAccountId: string, messageDbIds: string[]) {
    const trash = await this.prisma.mailFolder.findFirst({ where: { mailAccountId, specialUse: '\\Trash' } });
    if (!trash) return { ok: false as const, reason: 'no-trash-folder' as const };
    await this.bulkMoveMessages(userId, mailAccountId, messageDbIds, trash.id);
    return { ok: true as const };
  }

  async bulkMarkSpam(userId: string, mailAccountId: string, messageDbIds: string[]) {
    const junk = await this.prisma.mailFolder.findFirst({ where: { mailAccountId, specialUse: '\\Junk' } });
    if (!junk) return { ok: false as const, reason: 'no-junk-folder' as const };
    await this.bulkMoveMessages(userId, mailAccountId, messageDbIds, junk.id);
    return { ok: true as const };
  }

  async createFolder(userId: string, mailAccountId: string, name: string, color?: string) {
    const { provider } = await this.buildProvider(userId, mailAccountId);
    let realPath: string;
    try {
      realPath = await provider.createFolder(name);
    } finally {
      await provider.disconnect();
    }

    return this.prisma.mailFolder.create({
      data: { mailAccountId, name, path: realPath, isCustom: true, color },
    });
  }

  private async getOwnedFolder(mailAccountId: string, folderId: string) {
    const folder = await this.prisma.mailFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Carpeta no encontrada');
    if (folder.mailAccountId !== mailAccountId) {
      throw new ForbiddenException('La carpeta no pertenece a esta cuenta');
    }
    return folder;
  }

  async setFolderColor(mailAccountId: string, folderId: string, color: string | null) {
    await this.getOwnedFolder(mailAccountId, folderId);
    return this.prisma.mailFolder.update({ where: { id: folderId }, data: { color } });
  }

  // Renombrar/borrar se bloquea solo en carpetas de sistema (specialUse:
  // Inbox, Sent, Trash, Junk, Drafts, Archive) para no romper nada del lado
  // del hosting. Antes se usaba "isCustom" (creada desde el botón de esta
  // app), pero eso dejaba sin poder borrar carpetas reales creadas por otro
  // cliente de correo o por una versión anterior con el bug del namespace.
  async renameFolder(userId: string, mailAccountId: string, folderId: string, newName: string) {
    const folder = await this.getOwnedFolder(mailAccountId, folderId);
    if (folder.specialUse) {
      throw new ForbiddenException('No se pueden renombrar las carpetas del sistema');
    }

    const { provider } = await this.buildProvider(userId, mailAccountId);
    let realPath: string;
    try {
      realPath = await provider.renameFolder(folder.path, newName);
    } finally {
      await provider.disconnect();
    }

    return this.prisma.mailFolder.update({
      where: { id: folderId },
      data: { name: newName, path: realPath },
    });
  }

  async deleteFolder(userId: string, mailAccountId: string, folderId: string) {
    const folder = await this.getOwnedFolder(mailAccountId, folderId);
    if (folder.specialUse) {
      throw new ForbiddenException('No se pueden eliminar las carpetas del sistema');
    }

    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      await provider.deleteFolder(folder.path);
    } catch (error) {
      // Si en el servidor ya no existe con ese path exacto (p.ej. quedó
      // desincronizada tras un rename fuera de nuestro control), igual
      // limpiamos el registro local en vez de dejar un 500 y una carpeta
      // fantasma que no se puede borrar desde la UI.
      this.logger.warn(`No se pudo borrar la carpeta ${folder.path} en el servidor: ${String(error)}`);
    } finally {
      await provider.disconnect();
    }

    await this.prisma.mailFolder.delete({ where: { id: folderId } });
  }

  // Vacía una carpeta por completo (usado para "Vaciar papelera"/"Vaciar
  // spam"): borra los mensajes de verdad en el servidor (no los mueve) y
  // limpia el cache local.
  async emptyFolder(userId: string, mailAccountId: string, folderId: string) {
    const folder = await this.getOwnedFolder(mailAccountId, folderId);

    const { provider } = await this.buildProvider(userId, mailAccountId);
    try {
      await provider.emptyFolder(folder.path);
    } finally {
      await provider.disconnect();
    }

    await this.prisma.mailMessage.deleteMany({ where: { folderId } });
    await this.prisma.mailFolder.update({ where: { id: folderId }, data: { totalCount: 0, unreadCount: 0 } });
  }

  // Bandeja unificada: últimos mensajes de INBOX de todas las cuentas del
  // usuario, mezclados y ordenados por fecha (solo lectura del cache local).
  async unifiedInbox(userId: string, page = 1, pageSize = 50, category?: string) {
    const take = Math.min(pageSize, 200);
    const baseWhere = { mailAccount: { userId }, folder: { specialUse: '\\Inbox' as const } };
    const where: Prisma.MailMessageWhereInput = category ? { ...baseWhere, category: category as never } : baseWhere;
    const [items, total, categoryCounts, unreadCategoryCounts] = await Promise.all([
      this.prisma.mailMessage.findMany({
        where,
        include: {
          mailAccount: { select: { id: true, label: true, emailAddress: true } },
          folder: { select: { id: true } },
        },
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.mailMessage.count({ where }),
      this.categoryCounts(baseWhere),
      this.categoryCounts({ ...baseWhere, isRead: false }),
    ]);
    return { items, total, page, pageSize: take, categoryCounts, unreadCategoryCounts };
  }

  // "Destacados": mensajes marcados con estrella en cualquier cuenta/carpeta
  // del usuario. No es una carpeta real (isFlagged es un flag IMAP sobre el
  // mensaje en su carpeta original), así que se arma igual que la unificada.
  async starredMessages(userId: string, page = 1, pageSize = 50) {
    const take = Math.min(pageSize, 200);
    const where = { mailAccount: { userId }, isFlagged: true };
    const [items, total] = await Promise.all([
      this.prisma.mailMessage.findMany({
        where,
        include: {
          mailAccount: { select: { id: true, label: true, emailAddress: true } },
          folder: { select: { id: true } },
        },
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.mailMessage.count({ where }),
    ]);
    return { items, total, page, pageSize: take };
  }
}
