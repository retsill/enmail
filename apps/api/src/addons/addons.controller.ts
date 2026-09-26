import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../users/roles.guard.js';
import { Roles } from '../users/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';
import { UpdateAddonConfigDto } from './dto/update-addon-config.dto.js';

const PUBLIC_SELECT = { id: true, slug: true, name: true, description: true, enabled: true } as const;

@UseGuards(JwtAuthGuard)
@Controller('addons')
export class AddonsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  // Todos los usuarios ven esto (para saber qué botones "Conectar" mostrar),
  // por eso nunca incluye clientId/secret.
  @Get()
  list() {
    return this.prisma.addon.findMany({ select: PUBLIC_SELECT, orderBy: { name: 'asc' } });
  }

  // Config de la integración (client id/secret/redirect) — solo admin.
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':slug/config')
  async getConfig(@Param('slug') slug: string) {
    const addon = await this.prisma.addon.findUniqueOrThrow({ where: { slug } });
    return {
      slug: addon.slug,
      name: addon.name,
      enabled: addon.enabled,
      clientId: addon.clientId,
      redirectUri: addon.redirectUri,
      hasClientSecret: !!addon.encryptedClientSecret,
    };
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put(':slug/config')
  async updateConfig(@Param('slug') slug: string, @Body() dto: UpdateAddonConfigDto) {
    const addon = await this.prisma.addon.update({
      where: { slug },
      data: {
        enabled: dto.enabled,
        clientId: dto.clientId,
        redirectUri: dto.redirectUri,
        ...(dto.clientSecret ? { encryptedClientSecret: this.crypto.encrypt(dto.clientSecret) } : {}),
      },
    });
    return {
      slug: addon.slug,
      name: addon.name,
      enabled: addon.enabled,
      clientId: addon.clientId,
      redirectUri: addon.redirectUri,
      hasClientSecret: !!addon.encryptedClientSecret,
    };
  }
}
