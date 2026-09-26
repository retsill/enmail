import { ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { AuthService } from '../auth/auth.service.js';
import type { CompleteSetupDto } from './dto/complete-setup.dto.js';

// Reemplaza al admin sembrado con credenciales fijas (admin@webmail.local):
// la primera vez que se abre la app (sin ningún ADMIN todavía), el frontend
// manda acá a un wizard en vez de al login — así cada instalación arranca
// con una cuenta y una contraseña reales, elegidas por quien instala, en
// vez de un usuario/clave de ejemplo dando vueltas en la documentación.
@Injectable()
export class SetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly auth: AuthService,
  ) {}

  async needsSetup(): Promise<boolean> {
    const adminCount = await this.prisma.user.count({ where: { role: 'ADMIN' } });
    return adminCount === 0;
  }

  async complete(dto: CompleteSetupDto) {
    if (!(await this.needsSetup())) {
      throw new ForbiddenException('La instalación ya se completó antes.');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const admin = await this.prisma.user.upsert({
      where: { email: dto.adminEmail },
      create: {
        name: dto.adminName,
        email: dto.adminEmail,
        passwordHash,
        role: 'ADMIN',
        authSource: 'LOCAL',
      },
      // Por si el email coincide con una cuenta MAIL_SERVER que ya se logueó
      // sola antes del wizard (agregar cuentas es libre): la convertimos en
      // el admin en vez de fallar por email duplicado.
      update: {
        name: dto.adminName,
        passwordHash,
        role: 'ADMIN',
        authSource: 'LOCAL',
      },
    });

    await this.settings.updateMailServerSettings({
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapTls: dto.imapTls,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpTls: dto.smtpTls,
    });

    if (dto.siteName) {
      await this.settings.updateSystemSettings({ siteName: dto.siteName });
    }

    return this.auth.issueToken(admin);
  }
}
