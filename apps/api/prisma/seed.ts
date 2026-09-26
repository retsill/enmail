import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const addons = [
    { slug: 'gmail', name: 'Gmail', description: 'Conecta cuentas de Gmail vía OAuth2 (IMAP/SMTP con XOAUTH2)' },
    { slug: 'outlook', name: 'Outlook / Microsoft 365', description: 'Conecta cuentas de Outlook vía OAuth2 (IMAP/SMTP con XOAUTH2)' },
    { slug: 'yahoo', name: 'Yahoo', description: 'Conector para Yahoo Mail (próximamente)' },
    { slug: 'aol', name: 'AOL', description: 'Conector para AOL Mail (próximamente)' },
  ];

  for (const addon of addons) {
    await prisma.addon.upsert({
      where: { slug: addon.slug },
      create: addon,
      update: { name: addon.name, description: addon.description },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@webmail.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin12345';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: 'ADMIN',
      },
    });
    console.log(`Admin creado: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Admin ya existe: ${adminEmail}`);
  }

  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default' },
    update: {},
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
