import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, search?: string) {
    return this.prisma.contact.findMany({
      where: search
        ? {
            userId,
            OR: [{ email: { contains: search } }, { name: { contains: search } }],
          }
        : { userId },
      orderBy: [{ timesUsed: 'desc' }, { lastUsedAt: 'desc' }],
      take: search ? 10 : undefined,
    });
  }

  // Se llama tras un envío exitoso: guarda o actualiza cada destinatario
  // como contacto para alimentar el autocompletado del campo "Para". Un
  // remitente sin nombre (caso normal al escribir a mano en "Para") no pisa
  // un nombre ya guardado antes.
  async recordContacts(userId: string, recipients: Array<{ email: string; name?: string }>) {
    const seen = new Set<string>();
    for (const { email, name } of recipients) {
      const normalized = email.trim().toLowerCase();
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);

      const existing = await this.prisma.contact.findUnique({
        where: { userId_email: { userId, email: normalized } },
      });
      await this.prisma.contact.upsert({
        where: { userId_email: { userId, email: normalized } },
        create: { userId, email: normalized, name: name || undefined, timesUsed: 1 },
        update: {
          timesUsed: { increment: 1 },
          lastUsedAt: new Date(),
          name: !existing?.name && name ? name : undefined,
        },
      });
    }
  }

  async create(userId: string, email: string, name?: string) {
    const normalized = email.trim().toLowerCase();
    return this.prisma.contact.upsert({
      where: { userId_email: { userId, email: normalized } },
      create: { userId, email: normalized, name },
      update: { name },
    });
  }

  async update(userId: string, contactId: string, data: { name?: string; email?: string }) {
    const contact = await this.getOwned(userId, contactId);
    return this.prisma.contact.update({
      where: { id: contact.id },
      data: {
        name: data.name,
        email: data.email ? data.email.trim().toLowerCase() : undefined,
      },
    });
  }

  async delete(userId: string, contactId: string) {
    const contact = await this.getOwned(userId, contactId);
    await this.prisma.contact.delete({ where: { id: contact.id } });
  }

  private async getOwned(userId: string, contactId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contacto no encontrado');
    if (contact.userId !== userId) throw new ForbiddenException('El contacto no pertenece a este usuario');
    return contact;
  }
}
