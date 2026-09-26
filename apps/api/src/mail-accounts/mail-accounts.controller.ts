import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { MailAccountsService } from './mail-accounts.service.js';
import { CreateMailAccountDto } from './dto/create-mail-account.dto.js';
import { UpdateMailAccountDto } from './dto/update-mail-account.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('mail-accounts')
export class MailAccountsController {
  constructor(private readonly mailAccountsService: MailAccountsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.mailAccountsService.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMailAccountDto) {
    return this.mailAccountsService.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateMailAccountDto,
  ) {
    return this.mailAccountsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.mailAccountsService.remove(user.sub, id);
  }

  @Post(':id/primary')
  setPrimary(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.mailAccountsService.setPrimary(user.sub, id);
  }
}
