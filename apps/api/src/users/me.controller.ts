import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { UsersService } from './users.service.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'backgrounds');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// Preferencias del usuario logueado (cualquier rol) — separado de
// UsersController, que es solo administración de usuarios (admin-only).
@UseGuards(JwtAuthGuard)
@Controller('me/preferences')
export class MeController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.usersService.getPreferences(user.sub);
  }

  @Patch()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(user.sub, dto);
  }

  @Post('background')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
          const user = (req as unknown as { user?: JwtPayload }).user;
          cb(null, `${user?.sub ?? 'unknown'}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.has(file.mimetype)),
    }),
  )
  async uploadBackground(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Imagen inválida (usa PNG, JPG o WEBP, máximo 5MB)');
    return this.usersService.setBackgroundImage(user.sub, `/uploads/backgrounds/${file.filename}`);
  }
}
