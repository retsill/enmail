import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailAccountsService } from '../mail-accounts/mail-accounts.service.js';
import { MailSyncService } from './mail-sync.service.js';
import { BulkUpdateFlagsDto, UpdateFlagsDto } from './dto/update-flags.dto.js';
import { BulkMoveMessagesDto, MoveMessageDto } from './dto/move-message.dto.js';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('mail-accounts/:mailAccountId')
export class MailController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailAccounts: MailAccountsService,
    private readonly mailSync: MailSyncService,
  ) {}

  @Post('sync')
  async sync(@CurrentUser() user: JwtPayload, @Param('mailAccountId') mailAccountId: string) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.mailSync.syncAccount(user.sub, mailAccountId);
  }

  @Get('folders')
  async folders(@CurrentUser() user: JwtPayload, @Param('mailAccountId') mailAccountId: string) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.prisma.mailFolder.findMany({
      where: { mailAccountId },
      orderBy: { name: 'asc' },
    });
  }

  @Post('folders')
  async createFolder(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Body() dto: CreateFolderDto,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.mailSync.createFolder(user.sub, mailAccountId, dto.name, dto.color);
  }

  @Patch('folders/:folderId')
  async updateFolder(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    if (dto.name) {
      await this.mailSync.renameFolder(user.sub, mailAccountId, folderId, dto.name);
    }
    if (dto.color !== undefined) {
      return this.mailSync.setFolderColor(mailAccountId, folderId, dto.color);
    }
    return this.prisma.mailFolder.findUniqueOrThrow({ where: { id: folderId } });
  }

  @Delete('folders/:folderId')
  async deleteFolder(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('folderId') folderId: string,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    await this.mailSync.deleteFolder(user.sub, mailAccountId, folderId);
    return { ok: true };
  }

  @Get('folders/:folderId/messages')
  async messages(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('folderId') folderId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('category') category?: string,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    const take = Math.min(Number(pageSize) || 50, 200);
    const currentPage = Math.max(Number(page) || 1, 1);

    return this.mailSync.getFolderMessages(user.sub, mailAccountId, folderId, currentPage, take, category);
  }

  @Get('quota')
  async quota(@CurrentUser() user: JwtPayload, @Param('mailAccountId') mailAccountId: string) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.mailSync.getQuota(user.sub, mailAccountId);
  }

  @Get('folders/:folderId/messages/:uid/body')
  async body(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('folderId') folderId: string,
    @Param('uid') uid: string,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    const folder = await this.prisma.mailFolder.findUniqueOrThrow({ where: { id: folderId } });
    return this.mailSync.fetchMessageBody(user.sub, mailAccountId, folder.path, Number(uid));
  }

  @Patch('messages/:messageId/flags')
  async setFlags(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateFlagsDto,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.mailSync.setMessageFlags(user.sub, mailAccountId, messageId, dto);
  }

  @Post('messages/bulk-flags')
  async bulkSetFlags(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Body() dto: BulkUpdateFlagsDto,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    await this.mailSync.bulkSetMessageFlags(user.sub, mailAccountId, dto.messageIds, dto);
    return { ok: true };
  }

  @Post('messages/:messageId/move')
  async moveMessage(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('messageId') messageId: string,
    @Body() dto: MoveMessageDto,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    await this.mailSync.moveMessage(user.sub, mailAccountId, messageId, dto.targetFolderId);
    return { ok: true };
  }

  @Post('messages/bulk-move')
  async bulkMoveMessages(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Body() dto: BulkMoveMessagesDto,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    await this.mailSync.bulkMoveMessages(user.sub, mailAccountId, dto.messageIds, dto.targetFolderId);
    return { ok: true };
  }

  @Delete('messages/:messageId')
  async deleteMessage(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('messageId') messageId: string,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    const trash = await this.prisma.mailFolder.findFirst({
      where: { mailAccountId, specialUse: '\\Trash' },
    });
    if (!trash) return { ok: false, reason: 'no-trash-folder' };
    await this.mailSync.moveMessage(user.sub, mailAccountId, messageId, trash.id);
    return { ok: true };
  }

  @Post('messages/bulk-delete')
  async bulkDeleteMessages(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Body() dto: { messageIds: string[] },
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.mailSync.bulkDeleteMessages(user.sub, mailAccountId, dto.messageIds);
  }

  @Post('messages/bulk-spam')
  async bulkMarkSpam(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Body() dto: { messageIds: string[] },
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.mailSync.bulkMarkSpam(user.sub, mailAccountId, dto.messageIds);
  }

  @Post('folders/:folderId/empty')
  async emptyFolder(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('folderId') folderId: string,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    await this.mailSync.emptyFolder(user.sub, mailAccountId, folderId);
    return { ok: true };
  }

  @Post('messages/:messageId/spam')
  async markSpam(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('messageId') messageId: string,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    const junk = await this.prisma.mailFolder.findFirst({
      where: { mailAccountId, specialUse: '\\Junk' },
    });
    if (!junk) return { ok: false, reason: 'no-junk-folder' };
    await this.mailSync.moveMessage(user.sub, mailAccountId, messageId, junk.id);
    return { ok: true };
  }

  @Post('messages/:messageId/archive')
  async archiveMessage(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Param('messageId') messageId: string,
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    const archive = await this.prisma.mailFolder.findFirst({
      where: { mailAccountId, specialUse: '\\Archive' },
    });
    if (!archive) return { ok: false, reason: 'no-archive-folder' };
    await this.mailSync.moveMessage(user.sub, mailAccountId, messageId, archive.id);
    return { ok: true };
  }

  // multipart/form-data en vez de JSON: permite adjuntar archivos (el
  // límite por defecto del body JSON es 100kb, muy poco para un adjunto).
  // Los campos de texto (to/cc/bcc/subject/html/...) llegan como strings de
  // formulario; to/cc/bcc van serializados en JSON dentro de ese string.
  @Post('send')
  @UseInterceptors(
    FilesInterceptor('attachments', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async send(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);

    let to: string[];
    try {
      to = JSON.parse(body.to ?? '[]');
    } catch {
      throw new BadRequestException('Destinatarios inválidos');
    }
    if (!Array.isArray(to) || to.length === 0) {
      throw new BadRequestException('Falta al menos un destinatario');
    }
    if (!body.subject) {
      throw new BadRequestException('Falta el asunto');
    }

    const parseAddresses = (value?: string): string[] | undefined => {
      if (!value) return undefined;
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
      } catch {
        return undefined;
      }
    };

    return this.mailSync.sendMessage(user.sub, mailAccountId, {
      to,
      cc: parseAddresses(body.cc),
      bcc: parseAddresses(body.bcc),
      subject: body.subject,
      text: body.text || undefined,
      html: body.html || undefined,
      inReplyTo: body.inReplyTo || undefined,
      references: body.references || undefined,
      attachments: files.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })),
    });
  }

  // Al cerrar "Redactar" sin enviar, si hay contenido real, se sube como
  // borrador a la carpeta Drafts de la cuenta (JSON simple, sin adjuntos —
  // un borrador descartado no necesita el camino de multipart de /send).
  @Post('drafts')
  async saveDraft(
    @CurrentUser() user: JwtPayload,
    @Param('mailAccountId') mailAccountId: string,
    @Body() body: { to?: string[]; cc?: string[]; bcc?: string[]; subject?: string; html?: string },
  ) {
    await this.mailAccounts.findOwned(user.sub, mailAccountId);
    return this.mailSync.saveDraft(user.sub, mailAccountId, body);
  }
}
