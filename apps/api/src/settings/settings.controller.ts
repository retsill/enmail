import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../users/roles.guard.js';
import { Roles } from '../users/roles.decorator.js';
import { UserRole } from '../generated/prisma/enums.js';
import { SettingsService } from './settings.service.js';
import { UpdateSystemSettingsDto } from './dto/update-system-settings.dto.js';
import { UpdateMailServerSettingsDto } from './dto/update-mail-server-settings.dto.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'branding');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/x-icon', 'image/webp']);

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  // Público: la pantalla de login necesita el nombre/logo antes de autenticar.
  @Get('system')
  getSystemSettings() {
    return this.settings.getSystemSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('system')
  updateSystemSettings(@Body() dto: UpdateSystemSettingsDto) {
    return this.settings.updateSystemSettings(dto);
  }

  // Público: el footer y el login muestran estas páginas sin estar logueados.
  @Get('pages')
  listSitePages() {
    return this.settings.listSitePages();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('pages')
  createSitePage(@Body() dto: { title: string; content: string; order?: number }) {
    return this.settings.createSitePage(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('pages/:id')
  updateSitePage(@Param('id') id: string, @Body() dto: { title?: string; content?: string; order?: number }) {
    return this.settings.updateSitePage(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete('pages/:id')
  deleteSitePage(@Param('id') id: string) {
    return this.settings.deleteSitePage(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('mail-server')
  getMailServerSettings() {
    return this.settings.getMailServerSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Put('mail-server')
  updateMailServerSettings(@Body() dto: UpdateMailServerSettingsDto) {
    return this.settings.updateMailServerSettings({
      imapHost: dto.imapHost,
      imapPort: dto.imapPort,
      imapTls: dto.imapTls ?? true,
      smtpHost: dto.smtpHost,
      smtpPort: dto.smtpPort,
      smtpTls: dto.smtpTls ?? false,
      allowInsecureTls: dto.allowInsecureTls ?? false,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('logo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        // Nombre con timestamp (no fijo "logo.png"): si el nombre no cambia,
        // el navegador nunca vuelve a pedir la imagen aunque el contenido en
        // el servidor sí haya cambiado — se ve el logo viejo hasta recargar
        // a la fuerza. Con esto, cada resubida es una URL nueva.
        filename: (_req, file, cb) => cb(null, `logo-${Date.now()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.has(file.mimetype)),
    }),
  )
  async uploadLogo(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo de imagen inválido');
    return this.settings.updateSystemSettings({ logoUrl: `/uploads/branding/${file.filename}` });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('logo-dark')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => cb(null, `logo-dark${extname(file.originalname)}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.has(file.mimetype)),
    }),
  )
  async uploadLogoDark(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo de imagen inválido');
    return this.settings.updateSystemSettings({ logoUrlDark: `/uploads/branding/${file.filename}` });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('favicon')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => cb(null, `favicon${extname(file.originalname)}`),
      }),
      limits: { fileSize: 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.has(file.mimetype)),
    }),
  )
  async uploadFavicon(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo de imagen inválido');
    return this.settings.updateSystemSettings({ faviconUrl: `/uploads/branding/${file.filename}` });
  }
}
