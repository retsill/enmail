import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';
import type { MailboxPasswordConfig, MailboxPasswordProvider } from './mailbox-password-provider.interface.js';
import { CPanelMailboxPasswordProvider } from './cpanel-provider.js';
import { PleskMailboxPasswordProvider } from './plesk-provider.js';
import { AaPanelMailboxPasswordProvider } from './aapanel-provider.js';

const SETTINGS_ID = 'default';

@Injectable()
export class MailboxPasswordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  private buildProvider(settings: {
    mailboxPasswordProvider: string | null;
    mailboxPasswordBaseUrl: string | null;
    mailboxPasswordUsername: string | null;
    encryptedMailboxPasswordSecret: string | null;
    mailboxPasswordAllowInsecureTls: boolean;
  }): MailboxPasswordProvider | null {
    if (
      !settings.mailboxPasswordProvider ||
      !settings.mailboxPasswordBaseUrl ||
      !settings.encryptedMailboxPasswordSecret
    ) {
      return null;
    }
    const config: MailboxPasswordConfig = {
      baseUrl: settings.mailboxPasswordBaseUrl.replace(/\/+$/, ''),
      username: settings.mailboxPasswordUsername ?? '',
      secret: this.crypto.decrypt(settings.encryptedMailboxPasswordSecret),
      allowInsecureTls: settings.mailboxPasswordAllowInsecureTls,
    };
    switch (settings.mailboxPasswordProvider) {
      case 'CPANEL':
        return new CPanelMailboxPasswordProvider(config);
      case 'PLESK':
        return new PleskMailboxPasswordProvider(config);
      case 'AAPANEL':
        return new AaPanelMailboxPasswordProvider(config);
      default:
        return null;
    }
  }

  async isConfigured(): Promise<boolean> {
    const settings = await this.prisma.mailServerSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (!settings) return false;
    return this.buildProvider(settings) !== null;
  }

  async testConnection(config: {
    provider: string;
    baseUrl: string;
    username?: string;
    secret: string;
    allowInsecureTls?: boolean;
  }): Promise<void> {
    const provider = this.buildProvider({
      mailboxPasswordProvider: config.provider,
      mailboxPasswordBaseUrl: config.baseUrl,
      mailboxPasswordUsername: config.username ?? null,
      encryptedMailboxPasswordSecret: this.crypto.encrypt(config.secret),
      mailboxPasswordAllowInsecureTls: config.allowInsecureTls ?? false,
    });
    if (!provider) throw new BadRequestException('Configuración incompleta');
    await provider.testConnection();
  }

  // Para el botón "Probar conexión" del admin: si no mandó una clave nueva
  // (dejó el campo en blanco porque ya había una guardada), usa la que ya
  // está guardada en vez de obligar a retipearla solo para probar.
  async testConnectionFromSaved(overrides: {
    provider: string;
    baseUrl?: string;
    username?: string;
    secret?: string;
    allowInsecureTls?: boolean;
  }): Promise<void> {
    const settings = await this.prisma.mailServerSettings.findUnique({ where: { id: SETTINGS_ID } });
    const baseUrl = overrides.baseUrl || settings?.mailboxPasswordBaseUrl || '';
    if (!baseUrl) throw new BadRequestException('Falta la URL del panel');

    let secret = overrides.secret;
    if (!secret) {
      if (!settings?.encryptedMailboxPasswordSecret) {
        throw new BadRequestException('Falta la clave/token — todavía no hay una guardada para reutilizar');
      }
      secret = this.crypto.decrypt(settings.encryptedMailboxPasswordSecret);
    }

    await this.testConnection({
      provider: overrides.provider,
      baseUrl,
      username: overrides.username ?? settings?.mailboxPasswordUsername ?? undefined,
      secret,
      allowInsecureTls: overrides.allowInsecureTls ?? settings?.mailboxPasswordAllowInsecureTls ?? false,
    });
  }

  async changeRealMailboxPassword(email: string, newPassword: string): Promise<void> {
    const settings = await this.prisma.mailServerSettings.findUnique({ where: { id: SETTINGS_ID } });
    const provider = settings ? this.buildProvider(settings) : null;
    if (!provider) {
      throw new BadRequestException('El administrador no configuró un panel de hosting para esto');
    }
    await provider.changePassword(email, newPassword);
  }
}
