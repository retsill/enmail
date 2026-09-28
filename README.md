# enMail

Un webmail propio, con interfaz moderna estilo Gmail, que se conecta a tu servidor de correo (IMAP/SMTP) — el de tu hosting (cPanel, aaPanel, Plesk, etc.) o cualquier otro. Gratis y de código abierto (MIT).

**📖 Documentación completa:** [docs.xcodevs.com/enmail](https://docs.xcodevs.com/enmail) — instalación con Docker, instalación manual, y guías para aaPanel, cPanel, Plesk y Hostinger.

## Inicio rápido (Docker)

```bash
git clone https://github.com/retsill/enmail.git
cd enmail
cp .env.example .env
# editá .env: dominio, contraseñas y secretos
docker compose up -d --build
```

Entrá a `http://localhost:3000` — como es la primera vez, te lleva directo a un asistente de instalación para crear tu cuenta de administrador y cargar los datos de tu servidor de correo. Guía completa: [docs.xcodevs.com/enmail/es/docker.html](https://docs.xcodevs.com/enmail/es/docker.html).

## Estructura del proyecto

```
apps/
  api/     NestJS + Prisma (MySQL) — backend/API
  web/     Next.js — interfaz web
  docs/    Documentación estática (HTML/CSS, ES/EN)
packages/
  shared/  Tipos e interfaces compartidas entre api y web
```

## Desarrollo local

```bash
npm install
# apps/api/.env y apps/web/.env.local — ver .env.example en cada carpeta
npm run dev:api    # http://localhost:3001
npm run dev:web    # http://localhost:3000
```

## Licencia

[MIT](LICENSE) — usalo, modificalo y redistribuilo libremente, incluso en proyectos comerciales.

---

Worked: XcoDevs, by: Enwebs Estudios
