import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';

const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async getSystemSettings() {
    return this.prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  async updateSystemSettings(data: {
    siteName?: string;
    logoUrl?: string | null;
    logoUrlDark?: string | null;
    faviconUrl?: string | null;
    defaultLocale?: string;
  }) {
    return this.prisma.systemSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
  }

  // Páginas dinámicas (Términos, Privacidad, etc.) — el título sale en el
  // footer y el contenido se ve en un modal, logueado o desde el login.
  async listSitePages() {
    return this.prisma.sitePage.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  }

  async createSitePage(data: { title: string; content: string; order?: number }) {
    return this.prisma.sitePage.create({ data });
  }

  async updateSitePage(id: string, data: { title?: string; content?: string; order?: number }) {
    return this.prisma.sitePage.update({ where: { id }, data });
  }

  async deleteSitePage(id: string) {
    await this.prisma.sitePage.delete({ where: { id } });
    return { ok: true };
  }

  async getMailServerSettings() {
    return this.prisma.mailServerSettings.findUnique({ where: { id: SETTINGS_ID } });
  }

  async updateMailServerSettings(data: {
    imapHost: string;
    imapPort: number;
    imapTls: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpTls: boolean;
    allowInsecureTls?: boolean;
  }) {
    return this.prisma.mailServerSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
  }

  async getMailboxPasswordProviderConfig() {
    const settings = await this.prisma.mailServerSettings.findUnique({ where: { id: SETTINGS_ID } });
    return {
      provider: settings?.mailboxPasswordProvider ?? 'NONE',
      baseUrl: settings?.mailboxPasswordBaseUrl ?? '',
      username: settings?.mailboxPasswordUsername ?? '',
      allowInsecureTls: settings?.mailboxPasswordAllowInsecureTls ?? false,
      hasSecret: !!settings?.encryptedMailboxPasswordSecret,
    };
  }

  // Igual que Addon.encryptedClientSecret: si no mandan una clave/token
  // nuevo, se deja la guardada tal cual en vez de borrarla.
  async updateMailboxPasswordProvider(data: {
    provider: string;
    baseUrl?: string;
    username?: string;
    secret?: string;
    allowInsecureTls?: boolean;
  }) {
    const isNone = data.provider === 'NONE';
    const existing = await this.prisma.mailServerSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!existing) {
      throw new BadRequestException('Configurá primero el servidor de correo (IMAP/SMTP) antes de esto');
    }
    const settings = await this.prisma.mailServerSettings.update({
      where: { id: SETTINGS_ID },
      data: {
        mailboxPasswordProvider: isNone ? null : data.provider,
        mailboxPasswordBaseUrl: isNone ? null : (data.baseUrl ?? null),
        mailboxPasswordUsername: isNone ? null : (data.username ?? null),
        mailboxPasswordAllowInsecureTls: data.allowInsecureTls ?? false,
        ...(isNone ? { encryptedMailboxPasswordSecret: null } : {}),
        ...(!isNone && data.secret ? { encryptedMailboxPasswordSecret: this.crypto.encrypt(data.secret) } : {}),
      },
    });
    return {
      provider: settings.mailboxPasswordProvider ?? 'NONE',
      baseUrl: settings.mailboxPasswordBaseUrl ?? '',
      username: settings.mailboxPasswordUsername ?? '',
      allowInsecureTls: settings.mailboxPasswordAllowInsecureTls,
      hasSecret: !!settings.encryptedMailboxPasswordSecret,
    };
  }
}
