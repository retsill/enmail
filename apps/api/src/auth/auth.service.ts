import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { MailAccountsService } from '../mail-accounts/mail-accounts.service.js';
import { ImapMailProvider } from '../mail/imap-mail-provider.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly settings: SettingsService,
    private readonly mailAccounts: MailAccountsService,
  ) {}

  async login(email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });

    // Cuentas locales (ej. el admin del instalador): se validan con bcrypt,
    // nunca contra IMAP.
    if (existing?.authSource === 'LOCAL') {
      if (!existing.isActive || !existing.passwordHash) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      const matches = await bcrypt.compare(password, existing.passwordHash);
      if (!matches) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      return this.issueToken(existing);
    }

    // Cualquier otro caso: el correo es la identidad y se valida en vivo
    // contra el servidor IMAP configurado (igual que Roundcube). Así, un
    // buzón creado en cPanel/Plesk/aaPanel/etc. funciona solo con iniciar
    // sesión, sin necesidad de agregarlo a mano.
    const server = await this.settings.getMailServerSettings();
    if (!server) {
      throw new UnauthorizedException(
        'El servidor de correo aún no está configurado. Contacta al administrador.',
      );
    }

    await this.verifyImapCredentials(email, password, server);

    const user =
      existing ??
      (await this.prisma.user.create({
        data: { name: email.split('@')[0], email, authSource: 'MAIL_SERVER', role: 'USER' },
      }));

    if (!user.isActive) {
      throw new UnauthorizedException('Esta cuenta está desactivada');
    }

    await this.mailAccounts.ensurePrimaryAccount(user.id, email, password, server);

    return this.issueToken(user);
  }

  // Público: UsersService también necesita validar la contraseña ACTUAL de
  // una cuenta MAIL_SERVER en vivo antes de dejar que cambie la contraseña
  // real del buzón (ver changePassword ahí).
  async verifyImapCredentials(
    email: string,
    password: string,
    server: { imapHost: string; imapPort: number; imapTls: boolean; allowInsecureTls?: boolean },
  ) {
    const provider = new ImapMailProvider();
    try {
      await provider.connect({
        host: server.imapHost,
        port: server.imapPort,
        tls: server.imapTls,
        allowInvalidCert: server.allowInsecureTls,
        username: email,
        password,
      });
    } catch (error) {
      // Sin distinguir esto, un problema de conexión/certificado (servidor
      // caído, TLS mal configurado) se reportaba igual que una contraseña
      // incorrecta — imposible de diagnosticar desde el mensaje de error.
      const err = error as { authenticationFailed?: boolean; code?: string };
      if (err.authenticationFailed) {
        throw new UnauthorizedException('Credenciales inválidas');
      }
      throw new UnauthorizedException(
        `No se pudo conectar al servidor de correo (${err.code ?? 'error desconocido'}). Avisá al administrador.`,
      );
    } finally {
      await provider.disconnect().catch(() => undefined);
    }
  }

  // Público: el wizard de instalación (SetupService) también necesita loguear
  // al admin recién creado de una, sin pedirle que inicie sesión aparte.
  async issueToken(user: {
    id: string;
    name: string;
    email: string;
    role: string;
    authSource?: string;
    avatarUrl?: string | null;
  }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => undefined);
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        authSource: user.authSource ?? 'LOCAL',
        avatarUrl: user.avatarUrl ?? null,
      },
    };
  }
}
