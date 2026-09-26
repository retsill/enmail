import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { MailSyncService } from './mail-sync.service.js';

@UseGuards(JwtAuthGuard)
@Controller('mail')
export class UnifiedInboxController {
  constructor(private readonly mailSync: MailSyncService) {}

  @Get('unified-inbox')
  unifiedInbox(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
  ) {
    return this.mailSync.unifiedInbox(user.sub, Number(page) || 1, Number(pageSize) || 50, category);
  }

  @Get('starred')
  starred(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.mailSync.starredMessages(user.sub, Number(page) || 1, Number(pageSize) || 50);
  }
}
