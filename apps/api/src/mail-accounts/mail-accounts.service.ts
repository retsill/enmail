import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';
import type { CreateMailAccountDto } from './dto/create-mail-account.dto.js';
import type { UpdateMailAccountDto } from './dto/update-mail-account.dto.js';

const LIST_SELECT = {
  id: true,
  label: true,
  provider: true,
  emailAddress: true,
  isActive: true,
  isPrimary: true,
  signature: true,
  displayName: true,
  imapHost: true,
  imapPort: true,
  imapTls: true,
  smtpHost: true,
  smtpPort: true,
  smtpTls: true,
  username: true,
  createdAt: true,
} as const;

@Injectable()
export class MailAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  list(userId: string) {
    return this.prisma.mailAccount.findMany({
      where: { userId },
      select: LIST_SELECT,
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  // Verifica que la cuenta exista y pertenezca al usuario; la devuelve sin credenciales.
  async findOwned(userId: string, mailAccountId: string) {
    const account = await this.prisma.mailAccount.findUnique({
      where: { id: mailAccountId },
      select: { ...LIST_SELECT, userId: true },
    });
    if (!account) throw new NotFoundException('Cuenta de correo no encontrada');
    if (account.userId !== userId) throw new ForbiddenException('No tienes acceso a esta cuenta de correo');
    return account;
  }

  // Crea o actualiza la cuenta principal (buzón con el que el usuario inició
  // sesión). Se llama en cada login contra el servidor de correo, así que
  // también refresca la contraseña cifrada si cambió del lado del hosting.
  async ensurePrimaryAccount(
    userId: string,
    emailAddress: string,
    password: string,
    server: {
      imapHost: string;
      imapPort: number;
      imapTls: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpTls: boolean;
    },
  ) {
    const existing = await this.prisma.mailAccount.findFirst({
      where: { userId, isPrimary: true },
    });

    const data = {
      userId,
      provider: 'IMAP' as const,
      label: existing?.label ?? 'Correo principal',
      emailAddress,
      imapHost: server.imapHost,
      imapPort: server.imapPort,
      imapTls: server.imapTls,
      smtpHost: server.smtpHost,
      smtpPort: server.smtpPort,
      smtpTls: server.smtpTls,
      username: emailAddress,
      encryptedPassword: this.crypto.encrypt(password),
      isPrimary: true,
    };

    if (existing) {
      return this.prisma.mailAccount.update({ where: { id: existing.id }, data });
    }
    return this.prisma.mailAccount.create({ data });
  }

  // Crea o actualiza una cuenta conectada por OAuth (Gmail/Outlook). El
  // refresh token se guarda cifrado como JSON en el mismo campo que la
  // contraseña IMAP; MailSyncService lo distingue por `provider`.
  async upsertOAuthAccount(
    userId: string,
    provider: 'GMAIL' | 'OUTLOOK',
    emailAddress: string,
    refreshToken: string,
  ) {
    const existing = await this.prisma.mailAccount.findFirst({
      where: { userId, provider, emailAddress },
    });

    const data = {
      userId,
      provider,
      label: emailAddress,
      emailAddress,
      username: emailAddress,
      encryptedPassword: this.crypto.encrypt(JSON.stringify({ refreshToken })),
    };

    if (existing) {
      return this.prisma.mailAccount.update({ where: { id: existing.id }, data });
    }
    return this.prisma.mailAccount.create({ data });
  }

  async create(userId: string, dto: CreateMailAccountDto) {
    return this.prisma.mailAccount.create({
      data: {
        userId,
        provider: 'IMAP',
        label: dto.label,
        emailAddress: dto.emailAddress,
        imapHost: dto.imapHost,
        imapPort: dto.imapPort,
        imapTls: dto.imapTls ?? true,
        smtpHost: dto.smtpHost,
        smtpPort: dto.smtpPort,
        smtpTls: dto.smtpTls ?? true,
        username: dto.username,
        encryptedPassword: this.crypto.encrypt(dto.password),
      },
      select: LIST_SELECT,
    });
  }

  async update(userId: string, mailAccountId: string, dto: UpdateMailAccountDto) {
    await this.findOwned(userId, mailAccountId);

    return this.prisma.mailAccount.update({
      where: { id: mailAccountId },
      data: {
        label: dto.label,
        signature: dto.signature,
        displayName: dto.displayName,
        imapHost: dto.imapHost,
        imapPort: dto.imapPort,
        imapTls: dto.imapTls,
        smtpHost: dto.smtpHost,
        smtpPort: dto.smtpPort,
        smtpTls: dto.smtpTls,
        username: dto.username,
        ...(dto.password ? { encryptedPassword: this.crypto.encrypt(dto.password) } : {}),
      },
      select: LIST_SELECT,
    });
  }

  async remove(userId: string, mailAccountId: string) {
    await this.findOwned(userId, mailAccountId);
    await this.prisma.mailAccount.delete({ where: { id: mailAccountId } });
  }

  // Marca una cuenta como principal (la que se usa por defecto al redactar,
  // y la que aparece primero en la lista). Solo puede haber una por usuario,
  // así que se desmarca cualquier otra antes.
  async setPrimary(userId: string, mailAccountId: string) {
    await this.findOwned(userId, mailAccountId);
    await this.prisma.$transaction([
      this.prisma.mailAccount.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } }),
      this.prisma.mailAccount.update({ where: { id: mailAccountId }, data: { isPrimary: true } }),
    ]);
    return this.list(userId);
  }

  // Uso interno (mail module): trae la cuenta con credenciales descifradas.
  async getWithCredentials(userId: string, mailAccountId: string) {
    const account = await this.prisma.mailAccount.findUnique({ where: { id: mailAccountId } });

    if (!account) {
      throw new NotFoundException('Cuenta de correo no encontrada');
    }
    if (account.userId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta cuenta de correo');
    }
    if (!account.encryptedPassword) {
      throw new NotFoundException('La cuenta no tiene credenciales configuradas');
    }

    return {
      ...account,
      password: this.crypto.decrypt(account.encryptedPassword),
    };
  }
}
