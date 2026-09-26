import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
