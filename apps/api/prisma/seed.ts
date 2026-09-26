import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient();

// El admin ya NO se siembra con credenciales fijas acá — lo crea el wizard
// de instalación (GET/POST /setup) la primera vez que se abre la app, con
// el email/contraseña reales que elija quien instala.
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
