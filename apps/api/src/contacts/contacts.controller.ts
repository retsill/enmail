import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { ContactsService } from './contacts.service.js';

@UseGuards(JwtAuthGuard)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query('search') search?: string) {
    return this.contacts.list(user.sub, search);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: { email: string; name?: string }) {
    return this.contacts.create(user.sub, dto.email, dto.name);
  }

  @Patch(':contactId')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('contactId') contactId: string,
    @Body() dto: { email?: string; name?: string },
  ) {
    return this.contacts.update(user.sub, contactId, dto);
  }

  @Delete(':contactId')
  async delete(@CurrentUser() user: JwtPayload, @Param('contactId') contactId: string) {
    await this.contacts.delete(user.sub, contactId);
    return { ok: true };
  }
}
