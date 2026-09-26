import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { UserRole, ComposeStyle, MailDensity, ThemeBackgroundType } from '../generated/prisma/enums.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  list() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, authSource: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // Cualquier casilla que inició sesión directo contra el servidor de correo
  // (authSource MAIL_SERVER) arranca como USER — esto es lo único que la
  // puede convertir en admin del webmail después. No se deja auto-degradar
  // al admin que hace el cambio, para no dejar la cuenta sin ningún admin.
  async setRole(actingUserId: string, targetUserId: string, role: UserRole) {
    if (actingUserId === targetUserId) {
      throw new ForbiddenException('No podés cambiar tu propio rol');
    }
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: { id: true, name: true, email: true, role: true, authSource: true, isActive: true, createdAt: true },
    });
  }

  async create(input: { name: string; email: string; password: string; role?: UserRole }) {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    return this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role ?? 'USER',
      },
    });
  }

  private static readonly PREFERENCES_SELECT = {
    layoutColumns: true,
    composeStyle: true,
    pageSize: true,
    density: true,
    themeBackgroundType: true,
    themeBackground: true,
    backgroundOpacity: true,
    enabledCategories: true,
  } as const;

  getPreferences(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: UsersService.PREFERENCES_SELECT,
    });
  }

  updatePreferences(
    userId: string,
    data: {
      layoutColumns?: number;
      composeStyle?: ComposeStyle;
      pageSize?: number;
      density?: MailDensity;
      themeBackgroundType?: ThemeBackgroundType;
      themeBackground?: string | null;
      backgroundOpacity?: number;
      enabledCategories?: string[] | null;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        enabledCategories: data.enabledCategories === null ? Prisma.JsonNull : data.enabledCategories,
      },
      select: UsersService.PREFERENCES_SELECT,
    });
  }

  setBackgroundImage(userId: string, url: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { themeBackgroundType: 'IMAGE', themeBackground: url },
      select: UsersService.PREFERENCES_SELECT,
    });
  }

  private static readonly PROFILE_SELECT = {
    id: true,
    name: true,
    email: true,
    role: true,
    authSource: true,
    avatarUrl: true,
    lastLoginAt: true,
  } as const;

  getProfile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: UsersService.PROFILE_SELECT,
    });
  }

  updateName(userId: string, name: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: UsersService.PROFILE_SELECT,
    });
  }

  setAvatar(userId: string, url: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
      select: UsersService.PROFILE_SELECT,
    });
  }

  // Solo aplica a cuentas LOCAL (admin/staff creados en la app). Las
  // cuentas MAIL_SERVER no tienen passwordHash propio: su contraseña ES la
  // del buzón real y se valida en vivo contra IMAP en cada login, así que
  // cambiarla aquí no tendría ningún efecto real en el servidor de correo.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.authSource !== 'LOCAL' || !user.passwordHash) {
      throw new BadRequestException('Esta cuenta no gestiona su contraseña desde aquí');
    }
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true as const };
  }
}
