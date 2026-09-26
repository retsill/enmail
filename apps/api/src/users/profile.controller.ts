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
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

const UPLOADS_DIR = join(process.cwd(), 'uploads', 'avatars');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

// Perfil del usuario logueado (cualquier rol): nombre, avatar, contraseña.
// Separado de me/preferences (esas son de la UI del webmail, no de la
// identidad de la cuenta) y de UsersController (admin-only).
@UseGuards(JwtAuthGuard)
@Controller('me')
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Patch()
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateName(user.sub, dto.name!);
  }

  @Patch('password')
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (req, file, cb) => {
          const user = (req as unknown as { user?: JwtPayload }).user;
          cb(null, `${user?.sub ?? 'unknown'}-${Date.now()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 3 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => cb(null, ALLOWED_IMAGE_TYPES.has(file.mimetype)),
    }),
  )
  async uploadAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Imagen inválida (usa PNG, JPG o WEBP, máximo 3MB)');
    return this.usersService.setAvatar(user.sub, `/uploads/avatars/${file.filename}`);
  }
}
