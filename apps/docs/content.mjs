// Contenido de cada página de documentación, en los dos idiomas.
// generate.mjs arma el HTML final a partir de esto.

function callout(type, titleEs, titleEn, bodyEs, bodyEn) {
  return {
    es: `<div class="callout callout-${type}"><span class="callout-title">${titleEs}</span>${bodyEs}</div>`,
    en: `<div class="callout callout-${type}"><span class="callout-title">${titleEn}</span>${bodyEn}</div>`,
  };
}

export const PAGES = [
  // ---------------------------------------------------------------- index
  {
    slug: "index",
    title: { es: "Introducción", en: "Introduction" },
    description: {
      es: "Qué es enMail y cómo empezar a instalarlo.",
      en: "What enMail is and how to start installing it.",
    },
    body: {
      es: `
        <h1>enMail</h1>
        <p class="lede">Un webmail propio, con look moderno estilo Gmail, que se conecta a tu servidor de correo (IMAP/SMTP) — el tuyo, el de tu hosting (cPanel, aaPanel, Plesk, etc.) o cualquier otro. Gratis y de código abierto.</p>

        <h2>¿Qué incluye?</h2>
        <ul>
          <li>Bandeja de entrada unificada de varias cuentas de correo, con pestañas por categoría (Principal, Social, Promociones, Notificaciones).</li>
          <li>Editor de texto enriquecido propio (negrita, listas, colores, imágenes insertadas, enlaces).</li>
          <li>Redactar en ventanas emergentes (varias a la vez, como Gmail) o a pantalla completa.</li>
          <li>Borradores automáticos, contactos con autocompletado, firmas por cuenta.</li>
          <li>Layouts de 2 o 3 columnas (con la vista previa al costado o abajo), densidad ajustable, tema claro/oscuro, fondo personalizado.</li>
          <li>Panel de administración: marca (logo/favicon/nombre), páginas de contenido (Términos, Privacidad, etc.), conectores OAuth para Gmail/Outlook.</li>
          <li>Progressive Web App instalable, con el ícono que subas en Ajustes.</li>
          <li>Interfaz en español e inglés.</li>
        </ul>

        <h2>Cómo funciona el login</h2>
        <p>No hace falta dar de alta cada usuario a mano: cualquier casilla de correo que ya exista en tu servidor (creada desde cPanel, aaPanel, Plesk, etc.) puede iniciar sesión directo con su email y contraseña de correo — enMail valida contra el IMAP configurado en Ajustes, igual que hace Roundcube.</p>

        ${callout(
          "tip",
          "¿Cuál instalación me conviene?",
          "Which install should I use?",
          `<p>Si tenés acceso a Docker en tu servidor (aaPanel lo soporta con su plugin de Docker; en un VPS cualquiera también), es el camino más simple y el que mantenemos más probado. Si tu hosting es de los que no dan Docker (cPanel/Plesk compartidos, por ejemplo), usá la instalación manual con Node.js.</p>`,
          `<p>If your server has Docker available (aaPanel supports it via its Docker plugin; any VPS too), it's the simplest path and the one we keep best-tested. If your hosting doesn't offer Docker (shared cPanel/Plesk, for example), use the manual Node.js installation instead.</p>`,
        ).es}

        <div class="card-grid">
          <a class="card" href="docker.html">
            <div class="card-icon">🐳</div>
            <h3>Instalar con Docker</h3>
            <p>Un solo comando levanta la base de datos, la API y la web.</p>
          </a>
          <a class="card" href="manual.html">
            <div class="card-icon">⚙️</div>
            <h3>Instalación manual</h3>
            <p>Node.js + PM2 + Nginx, para hosting sin Docker.</p>
          </a>
          <a class="card" href="aapanel.html">
            <div class="card-icon">🖥️</div>
            <h3>Guías por panel</h3>
            <p>aaPanel, cPanel, Plesk y Hostinger paso a paso.</p>
          </a>
        </div>

        <h2>Requisitos</h2>
        <table>
          <tr><th>Con Docker</th><td>Docker Engine 24+ y el plugin Docker Compose. Nada más — MySQL corre dentro de un contenedor.</td></tr>
          <tr><th>Instalación manual</th><td>Node.js 20 o superior, MySQL 8, y opcionalmente PM2 + Nginx/Apache como proxy.</td></tr>
          <tr><th>Servidor de correo</th><td>Cualquier servidor IMAP/SMTP existente (Dovecot/Exim vía cPanel, aaPanel, Plesk, Google Workspace, etc.). enMail no reemplaza tu servidor de correo, es el cliente web.</td></tr>
        </table>

        <h2>Licencia</h2>
        <p>enMail es software libre, publicado bajo licencia MIT. Podés usarlo, modificarlo y redistribuirlo libremente, incluso en proyectos comerciales.</p>
      `,
      en: `
        <h1>enMail</h1>
        <p class="lede">A self-hosted webmail with a modern, Gmail-like look, that connects to your own mail server (IMAP/SMTP) — yours, your hosting's (cPanel, aaPanel, Plesk, etc.) or any other. Free and open source.</p>

        <h2>What's included</h2>
        <ul>
          <li>Unified inbox across multiple mail accounts, with category tabs (Primary, Social, Promotions, Updates).</li>
          <li>A custom-built rich text editor (bold, lists, colors, inline images, links).</li>
          <li>Compose in popup windows (several at once, like Gmail) or full screen.</li>
          <li>Automatic drafts, contacts with autocomplete, per-account signatures.</li>
          <li>2 or 3 column layouts (preview to the side or below), adjustable density, light/dark theme, custom background.</li>
          <li>Admin panel: branding (logo/favicon/name), content pages (Terms, Privacy, etc.), OAuth connectors for Gmail/Outlook.</li>
          <li>Installable Progressive Web App, using the icon you upload in Settings.</li>
          <li>Spanish and English interface.</li>
        </ul>

        <h2>How login works</h2>
        <p>You don't need to create each user by hand: any mailbox that already exists on your mail server (created from cPanel, aaPanel, Plesk, etc.) can log in directly with its email and mail password — enMail validates against the IMAP server configured in Settings, just like Roundcube does.</p>

        ${callout(
          "tip",
          "¿Cuál instalación me conviene?",
          "Which install should I use?",
          "",
          `<p>If your server has Docker available (aaPanel supports it via its Docker plugin; any VPS too), it's the simplest path and the one we keep best-tested. If your hosting doesn't offer Docker (shared cPanel/Plesk, for example), use the manual Node.js installation instead.</p>`,
        ).en}

        <div class="card-grid">
          <a class="card" href="docker.html">
            <div class="card-icon">🐳</div>
            <h3>Install with Docker</h3>
            <p>One command brings up the database, API and web app.</p>
          </a>
          <a class="card" href="manual.html">
            <div class="card-icon">⚙️</div>
            <h3>Manual installation</h3>
            <p>Node.js + PM2 + Nginx, for hosting without Docker.</p>
          </a>
          <a class="card" href="aapanel.html">
            <div class="card-icon">🖥️</div>
            <h3>Panel guides</h3>
            <p>aaPanel, cPanel, Plesk and Hostinger step by step.</p>
          </a>
        </div>

        <h2>Requirements</h2>
        <table>
          <tr><th>With Docker</th><td>Docker Engine 24+ and the Docker Compose plugin. Nothing else — MySQL runs inside a container.</td></tr>
          <tr><th>Manual install</th><td>Node.js 20 or newer, MySQL 8, and optionally PM2 + Nginx/Apache as a reverse proxy.</td></tr>
          <tr><th>Mail server</th><td>Any existing IMAP/SMTP server (Dovecot/Exim via cPanel, aaPanel, Plesk, Google Workspace, etc.). enMail doesn't replace your mail server, it's the web client.</td></tr>
        </table>

        <h2>License</h2>
        <p>enMail is free software, published under the MIT license. You can use, modify and redistribute it freely, including in commercial projects.</p>
      `,
    },
  },

  // --------------------------------------------------------------- docker
  {
    slug: "docker",
    title: { es: "Instalación con Docker", en: "Docker installation" },
    description: {
      es: "Levantá enMail con Docker Compose en minutos.",
      en: "Get enMail running with Docker Compose in minutes.",
    },
    body: {
      es: `
        <h1>Instalación con Docker <span class="badge">Recomendado</span></h1>
        <p class="lede">Docker Compose levanta los tres servicios (base de datos, API y web) con un solo comando.</p>

        <h2>1. Requisitos</h2>
        <ul>
          <li>Docker Engine 24 o superior.</li>
          <li>El plugin Docker Compose (viene incluido en instalaciones recientes de Docker; se invoca como <code>docker compose</code>, sin guion).</li>
        </ul>

        <h2>2. Descargar el proyecto</h2>
        <pre><code>git clone https://github.com/retsill/enmail.git
cd enmail</code></pre>

        <h2>3. Configurar las variables de entorno</h2>
        <pre><code>cp .env.example .env</code></pre>
        <p>Abrí <code>.env</code> y completá, como mínimo:</p>
        <ul>
          <li><code>APP_URL</code> y <code>NEXT_PUBLIC_API_URL</code>: el dominio/URL donde vas a acceder (podés dejar <code>localhost</code> para probar en tu propia máquina).</li>
          <li><code>MYSQL_PASSWORD</code> / <code>MYSQL_ROOT_PASSWORD</code>: contraseñas para la base de datos.</li>
          <li><code>JWT_SECRET</code> y <code>MAIL_ENCRYPTION_KEY</code>: generalos con <code>openssl rand -hex 32</code> (a <code>MAIL_ENCRYPTION_KEY</code> le tomás los primeros 32 caracteres).</li>
        </ul>
        <p>Ver el detalle completo de cada variable en <a href="configuration.html">Variables de entorno</a>.</p>

        <h2>4. Levantar los contenedores</h2>
        <pre><code>docker compose up -d --build</code></pre>
        <p>La primera vez tarda unos minutos (construye las imágenes). Al terminar, la API corre las migraciones de base de datos y crea el usuario administrador automáticamente.</p>

        <h2>5. Entrar</h2>
        <p>Abrí <code>http://localhost:3000</code> (o el dominio que configuraste) e iniciá sesión con:</p>
        <table>
          <tr><th>Email</th><td><code>admin@webmail.local</code></td></tr>
          <tr><th>Contraseña</th><td><code>admin12345</code></td></tr>
        </table>
        ${callout(
          "warning",
          "Cambiá la contraseña",
          "Change the password",
          "<p>Entrá a Ajustes → Perfil apenas inicies sesión y cambiá la contraseña del admin. Si preferís elegirla desde el principio, definí <code>SEED_ADMIN_EMAIL</code> y <code>SEED_ADMIN_PASSWORD</code> en tu <code>.env</code> antes del primer <code>docker compose up</code>.</p>",
          "",
        ).es}

        <h2>Comandos útiles</h2>
        <table>
          <tr><td><code>docker compose logs -f api</code></td><td>Ver los logs de la API en vivo.</td></tr>
          <tr><td><code>docker compose restart api web</code></td><td>Reiniciar después de cambiar el <code>.env</code>.</td></tr>
          <tr><td><code>docker compose down</code></td><td>Apagar todo (los datos de MySQL y los archivos subidos quedan guardados en volúmenes).</td></tr>
          <tr><td><code>docker compose exec api npm run db:seed</code></td><td>Volver a correr el sembrado (crear admin/conectores) manualmente si hiciera falta.</td></tr>
        </table>

        <h2>Actualizar a una versión nueva</h2>
        <pre><code>git pull
docker compose up -d --build</code></pre>

        <h2>Detrás de un panel (aaPanel, cPanel, Plesk)</h2>
        <p>Docker Compose no necesita que el panel "sepa" de Docker: corré los comandos de arriba por SSH en el servidor, y después configurá un dominio en tu panel como proxy reverso hacia el puerto que publicaste (<code>WEB_PORT</code>, 3000 por defecto). Ver la guía específica de tu panel en la sección Hosting del menú.</p>
      `,
      en: `
        <h1>Docker installation <span class="badge">Recommended</span></h1>
        <p class="lede">Docker Compose brings up all three services (database, API and web) with a single command.</p>

        <h2>1. Requirements</h2>
        <ul>
          <li>Docker Engine 24 or newer.</li>
          <li>The Docker Compose plugin (bundled with recent Docker installs; invoked as <code>docker compose</code>, no hyphen).</li>
        </ul>

        <h2>2. Get the project</h2>
        <pre><code>git clone https://github.com/retsill/enmail.git
cd enmail</code></pre>

        <h2>3. Configure environment variables</h2>
        <pre><code>cp .env.example .env</code></pre>
        <p>Open <code>.env</code> and fill in, at minimum:</p>
        <ul>
          <li><code>APP_URL</code> and <code>NEXT_PUBLIC_API_URL</code>: the domain/URL you'll access it from (you can leave <code>localhost</code> to try it on your own machine).</li>
          <li><code>MYSQL_PASSWORD</code> / <code>MYSQL_ROOT_PASSWORD</code>: database passwords.</li>
          <li><code>JWT_SECRET</code> and <code>MAIL_ENCRYPTION_KEY</code>: generate them with <code>openssl rand -hex 32</code> (take the first 32 characters for <code>MAIL_ENCRYPTION_KEY</code>).</li>
        </ul>
        <p>See the full list of variables in <a href="configuration.html">Environment variables</a>.</p>

        <h2>4. Start the containers</h2>
        <pre><code>docker compose up -d --build</code></pre>
        <p>The first run takes a few minutes (it builds the images). Once it's done, the API runs the database migrations and creates the admin user automatically.</p>

        <h2>5. Log in</h2>
        <p>Open <code>http://localhost:3000</code> (or the domain you configured) and log in with:</p>
        <table>
          <tr><th>Email</th><td><code>admin@webmail.local</code></td></tr>
          <tr><th>Password</th><td><code>admin12345</code></td></tr>
        </table>
        ${callout(
          "warning",
          "",
          "Change the password",
          "",
          "<p>Go to Settings → Profile as soon as you log in and change the admin password. If you'd rather choose it upfront, set <code>SEED_ADMIN_EMAIL</code> and <code>SEED_ADMIN_PASSWORD</code> in your <code>.env</code> before the first <code>docker compose up</code>.</p>",
        ).en}

        <h2>Useful commands</h2>
        <table>
          <tr><td><code>docker compose logs -f api</code></td><td>View the API logs live.</td></tr>
          <tr><td><code>docker compose restart api web</code></td><td>Restart after changing <code>.env</code>.</td></tr>
          <tr><td><code>docker compose down</code></td><td>Shut everything down (MySQL data and uploaded files stay in volumes).</td></tr>
          <tr><td><code>docker compose exec api npm run db:seed</code></td><td>Re-run seeding (admin/connectors) manually if needed.</td></tr>
        </table>

        <h2>Updating to a new version</h2>
        <pre><code>git pull
docker compose up -d --build</code></pre>

        <h2>Behind a panel (aaPanel, cPanel, Plesk)</h2>
        <p>Docker Compose doesn't need the panel to "know" about Docker: run the commands above over SSH on the server, then set up a domain in your panel as a reverse proxy to the port you published (<code>WEB_PORT</code>, 3000 by default). See your panel's specific guide in the Hosting section of the menu.</p>
      `,
    },
  },

  // --------------------------------------------------------------- manual
  {
    slug: "manual",
    title: { es: "Instalación manual", en: "Manual installation" },
    description: {
      es: "Instalar enMail sin Docker, con Node.js, PM2 y Nginx.",
      en: "Install enMail without Docker, using Node.js, PM2 and Nginx.",
    },
    body: {
      es: `
        <h1>Instalación manual (sin Docker)</h1>
        <p class="lede">Para hosting que no ofrece Docker: cPanel/Plesk compartidos, o cualquier VPS donde prefieras correrlo directo con Node.js.</p>

        <h2>1. Requisitos</h2>
        <ul>
          <li>Node.js 20 o superior y npm.</li>
          <li>MySQL 8 (o MariaDB 10.6+).</li>
          <li><a href="https://pm2.keymetrics.io/" target="_blank" rel="noopener">PM2</a> para mantener los procesos corriendo.</li>
          <li>Nginx o Apache como proxy reverso (para servir por HTTPS en el puerto 443 en vez de exponer los puertos 3000/3001 directo).</li>
        </ul>

        <h2>2. Descargar y preparar</h2>
        <pre><code>git clone https://github.com/retsill/enmail.git
cd enmail
npm install</code></pre>

        <h2>3. Base de datos</h2>
        <p>Creá una base de datos y un usuario MySQL para la app (por ejemplo, desde phpMyAdmin/adminer de tu panel, o por línea de comandos):</p>
        <pre><code>CREATE DATABASE webmail;
CREATE USER 'webmail'@'localhost' IDENTIFIED BY 'una-contraseña-segura';
GRANT ALL PRIVILEGES ON webmail.* TO 'webmail'@'localhost';</code></pre>

        <h2>4. Variables de entorno</h2>
        <pre><code>cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local</code></pre>
        <p>Completá <code>apps/api/.env</code> con tu <code>DATABASE_URL</code> real y valores propios de <code>JWT_SECRET</code>/<code>MAIL_ENCRYPTION_KEY</code>. En <code>apps/web/.env.local</code> poné la URL pública de la API en <code>NEXT_PUBLIC_API_URL</code> (por ejemplo <code>https://mail-api.tudominio.com/api</code>). Detalle completo en <a href="configuration.html">Variables de entorno</a>.</p>

        <h2>5. Migraciones y build</h2>
        <pre><code>cd apps/api
npx prisma migrate deploy
npm run db:seed
npm run build
cd ../web
npm run build
cd ../..</code></pre>

        <h2>6. Correr con PM2</h2>
        <pre><code>pm2 start apps/api/dist/main.js --name enmail-api
pm2 start "npm run start" --name enmail-web --cwd apps/web
pm2 save
pm2 startup</code></pre>
        <p>La API queda escuchando en el puerto 3001 y la web en el 3000 (podés cambiarlo con la variable <code>PORT</code>).</p>

        <h2>7. Proxy reverso con Nginx</h2>
        <p>Ejemplo de configuración para dos subdominios (uno para la web, otro para la API):</p>
        <pre><code>server {
  server_name mail.tudominio.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}

server {
  server_name mail-api.tudominio.com;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}</code></pre>
        <p>Después agregá HTTPS con Let's Encrypt (<code>certbot --nginx</code>) para ambos subdominios.</p>

        ${callout(
          "tip",
          "Con panel de control",
          "With a control panel",
          "<p>Si tu servidor tiene cPanel, aaPanel o Plesk, casi siempre es más simple usar la función propia del panel para manejar el dominio/SSL/proceso Node en vez de tocar Nginx a mano. Ver la guía de tu panel en la sección Hosting.</p>",
          "<p>If your server has cPanel, aaPanel or Plesk, it's almost always simpler to use the panel's own feature for managing the domain/SSL/Node process instead of touching Nginx by hand. See your panel's guide in the Hosting section.</p>",
        ).es}
      `,
      en: `
        <h1>Manual installation (without Docker)</h1>
        <p class="lede">For hosting that doesn't offer Docker: shared cPanel/Plesk, or any VPS where you'd rather run it directly with Node.js.</p>

        <h2>1. Requirements</h2>
        <ul>
          <li>Node.js 20 or newer, and npm.</li>
          <li>MySQL 8 (or MariaDB 10.6+).</li>
          <li><a href="https://pm2.keymetrics.io/" target="_blank" rel="noopener">PM2</a> to keep the processes running.</li>
          <li>Nginx or Apache as a reverse proxy (to serve over HTTPS on port 443 instead of exposing ports 3000/3001 directly).</li>
        </ul>

        <h2>2. Download and prepare</h2>
        <pre><code>git clone https://github.com/retsill/enmail.git
cd enmail
npm install</code></pre>

        <h2>3. Database</h2>
        <p>Create a MySQL database and user for the app (e.g. from your panel's phpMyAdmin/adminer, or via the command line):</p>
        <pre><code>CREATE DATABASE webmail;
CREATE USER 'webmail'@'localhost' IDENTIFIED BY 'a-secure-password';
GRANT ALL PRIVILEGES ON webmail.* TO 'webmail'@'localhost';</code></pre>

        <h2>4. Environment variables</h2>
        <pre><code>cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local</code></pre>
        <p>Fill in <code>apps/api/.env</code> with your real <code>DATABASE_URL</code> and your own <code>JWT_SECRET</code>/<code>MAIL_ENCRYPTION_KEY</code> values. In <code>apps/web/.env.local</code>, set the public API URL in <code>NEXT_PUBLIC_API_URL</code> (e.g. <code>https://mail-api.yourdomain.com/api</code>). Full detail in <a href="configuration.html">Environment variables</a>.</p>

        <h2>5. Migrations and build</h2>
        <pre><code>cd apps/api
npx prisma migrate deploy
npm run db:seed
npm run build
cd ../web
npm run build
cd ../..</code></pre>

        <h2>6. Run with PM2</h2>
        <pre><code>pm2 start apps/api/dist/main.js --name enmail-api
pm2 start "npm run start" --name enmail-web --cwd apps/web
pm2 save
pm2 startup</code></pre>
        <p>The API listens on port 3001 and the web app on 3000 (you can change this with the <code>PORT</code> variable).</p>

        <h2>7. Reverse proxy with Nginx</h2>
        <p>Example config for two subdomains (one for the web app, one for the API):</p>
        <pre><code>server {
  server_name mail.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}

server {
  server_name mail-api.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}</code></pre>
        <p>Then add HTTPS with Let's Encrypt (<code>certbot --nginx</code>) for both subdomains.</p>

        ${callout(
          "tip",
          "",
          "With a control panel",
          "",
          "<p>If your server has cPanel, aaPanel or Plesk, it's almost always simpler to use the panel's own feature for managing the domain/SSL/Node process instead of touching Nginx by hand. See your panel's guide in the Hosting section.</p>",
        ).en}
      `,
    },
  },

  // -------------------------------------------------------------- aapanel
  {
    slug: "aapanel",
    title: { es: "aaPanel", en: "aaPanel" },
    description: {
      es: "Instalar enMail en un servidor con aaPanel.",
      en: "Install enMail on a server running aaPanel.",
    },
    body: {
      es: `
        <h1>aaPanel</h1>
        <p class="lede">aaPanel no necesita "saber" que estás usando Docker o Node — es un panel para administrar dominios/SSL/archivos sobre un Linux normal. La forma más simple es instalar con Docker por SSH y usar aaPanel solo para el dominio y el certificado.</p>

        <h2>Opción A: Docker (recomendada)</h2>
        <h3>1. Instalar Docker</h3>
        <p>Desde aaPanel: <strong>App Store → Docker</strong> → instalar. O por SSH:</p>
        <pre><code>curl -fsSL https://get.docker.com | sh</code></pre>

        <h3>2. Subir el proyecto</h3>
        <p>Por SSH (o con el administrador de archivos de aaPanel):</p>
        <pre><code>cd /www/wwwroot
git clone https://github.com/retsill/enmail.git
cd enmail
cp .env.example .env
nano .env   # completá dominio, contraseñas y secretos</code></pre>

        <h3>3. Levantar los contenedores</h3>
        <p>Tenés dos formas, a elección — hacen exactamente lo mismo:</p>

        <h4>Opción con la interfaz de Docker de aaPanel (sin terminal)</h4>
        <p>La pestaña <strong>Docker Compose</strong> del plugin Docker (NO la pestaña "Container": esa es para crear un contenedor suelto a mano — enMail son 3 servicios coordinados por un mismo <code>docker-compose.yml</code>) funciona pegando el contenido, no apuntando a una carpeta:</p>
        <ol>
          <li>Menú lateral → <strong>Docker</strong> → pestaña <strong>Docker Compose</strong> → botón <strong>Add Compose</strong> (dejá la pestaña "General Creation" seleccionada).</li>
          <li><strong>Compose Name:</strong> por ejemplo <code>enmail</code>.</li>
          <li><strong>Compose Content:</strong> abrí <code>docker-compose.yml</code> del proyecto (ya clonado en el paso 2, ej. con el Administrador de archivos de aaPanel) y pegá todo su contenido acá.
            ${callout(
              "warning",
              "Un cambio necesario antes de pegar",
              "",
              `<p>aaPanel guarda este compose en su propia carpeta interna, no en <code>/www/wwwroot/enmail</code> — así que <code>context: .</code> ya no apunta a donde está tu código. Antes de pegar, reemplazá <code>context: .</code> por la ruta absoluta del proyecto en los dos servicios que buildean imagen (<code>api</code> y <code>web</code>):</p>
              <pre><code>  api:
    build:
      context: /www/wwwroot/enmail
      dockerfile: apps/api/Dockerfile
  ...
  web:
    build:
      context: /www/wwwroot/enmail
      dockerfile: apps/web/Dockerfile</code></pre>`,
              "",
            ).es}
          </li>
          <li><strong>.env Content:</strong> pegá el contenido completo de tu <code>.env</code> ya editado (con dominio, contraseñas y secretos reales).</li>
          <li><strong>Confirm.</strong> aaPanel corre el equivalente a <code>docker compose up -d --build</code> — vas a ver el progreso del build y, al terminar, el estado de los 3 contenedores (<code>db</code>, <code>api</code>, <code>web</code>) en la pestaña Container.</li>
        </ol>
        ${callout(
          "tip",
          "¿Para qué es 'Template List'?",
          "",
          "<p>Es solo para guardar composes reutilizables entre proyectos (tildando \"Also Save as Template\" al crear uno) — no hace falta para instalar enMail, podés ignorarlo.</p>",
          "",
        ).es}

        <h4>Opción por comando (Terminal de aaPanel o SSH)</h4>
        <p>Si preferís no pegar el compose a mano, es el mismo resultado corriendo esto dentro de la carpeta del proyecto — sin el problema del <code>context</code>, porque acá sí corre desde la carpeta real:</p>
        <pre><code>cd /www/wwwroot/enmail
docker compose up -d --build</code></pre>

        <h3>4. Crear los sitios en aaPanel</h3>
        <p>En <strong>Website → Add site</strong>, creá dos entradas (dos subdominios), sin PHP, y activá <strong>Reverse Proxy</strong> en cada una:</p>
        <table>
          <tr><th>Subdominio</th><th>Proxy hacia</th></tr>
          <tr><td><code>mail.tudominio.com</code></td><td><code>http://127.0.0.1:3000</code> (contenedor <code>web</code>)</td></tr>
          <tr><td><code>mail-api.tudominio.com</code></td><td><code>http://127.0.0.1:3001</code> (contenedor <code>api</code>)</td></tr>
        </table>
        ${callout(
          "warning",
          "Proxeá el dominio completo, no solo /api",
          "",
          `<p>Si aaPanel te pide un "directorio" para el reverse proxy, dejalo en <code>/</code> (la raíz), <strong>no</strong> en <code>/api</code>. La API sirve tanto <code>/api/*</code> como <code>/uploads/*</code> (logos, avatares, adjuntos) — si el proxy solo cubre <code>/api</code>, esas imágenes suben bien pero después nunca cargan (404), porque nginx nunca les llega a mandar esa parte al contenedor.</p>`,
          "",
        ).es}
        <p>Recordá que <code>NEXT_PUBLIC_API_URL</code> en tu <code>.env</code> debe apuntar a <code>https://mail-api.tudominio.com/api</code> <em>antes</em> de correr <code>docker compose up -d --build</code> (esta variable queda "horneada" en el build de la web).</p>

        <h3>5. SSL</h3>
        <p>En cada sitio, pestaña <strong>SSL</strong> → <strong>Let's Encrypt</strong> → solicitar certificado. Gratis y se renueva solo.</p>

        <h2>Opción B: Node.js directo (sin Docker)</h2>
        <p>Si preferís no usar Docker, instalá el plugin <strong>Node.js Version Manager</strong> desde el App Store de aaPanel, y seguí la <a href="manual.html">guía de instalación manual</a> — aaPanel te deja elegir la versión de Node y administrar el proceso con PM2 desde su propia interfaz, en vez de hacerlo todo por SSH.</p>
      `,
      en: `
        <h1>aaPanel</h1>
        <p class="lede">aaPanel doesn't need to "know" you're using Docker or Node — it's a panel for managing domains/SSL/files on a regular Linux box. The simplest approach is installing with Docker over SSH and using aaPanel only for the domain and certificate.</p>

        <h2>Option A: Docker (recommended)</h2>
        <h3>1. Install Docker</h3>
        <p>From aaPanel: <strong>App Store → Docker</strong> → install. Or over SSH:</p>
        <pre><code>curl -fsSL https://get.docker.com | sh</code></pre>

        <h3>2. Upload the project</h3>
        <p>Over SSH (or with aaPanel's file manager):</p>
        <pre><code>cd /www/wwwroot
git clone https://github.com/retsill/enmail.git
cd enmail
cp .env.example .env
nano .env   # fill in domain, passwords and secrets</code></pre>

        <h3>3. Start the containers</h3>
        <p>You have two ways to do this — they do exactly the same thing:</p>

        <h4>Using aaPanel's Docker interface (no terminal)</h4>
        <p>The <strong>Docker Compose</strong> tab in the Docker plugin (NOT the "Container" tab: that one creates a single container by hand — enMail is 3 services coordinated by one <code>docker-compose.yml</code>) works by pasting content in, not by pointing at a folder:</p>
        <ol>
          <li>Left menu → <strong>Docker</strong> → <strong>Docker Compose</strong> tab → <strong>Add Compose</strong> button (leave the "General Creation" tab selected).</li>
          <li><strong>Compose Name:</strong> e.g. <code>enmail</code>.</li>
          <li><strong>Compose Content:</strong> open the project's <code>docker-compose.yml</code> (already cloned in step 2, e.g. with aaPanel's File Manager) and paste its whole content here.
            ${callout(
              "warning",
              "",
              "One change needed before pasting",
              "",
              `<p>aaPanel stores this compose in its own internal folder, not in <code>/www/wwwroot/enmail</code> — so <code>context: .</code> no longer points at your code. Before pasting, replace <code>context: .</code> with the project's absolute path in the two services that build an image (<code>api</code> and <code>web</code>):</p>
              <pre><code>  api:
    build:
      context: /www/wwwroot/enmail
      dockerfile: apps/api/Dockerfile
  ...
  web:
    build:
      context: /www/wwwroot/enmail
      dockerfile: apps/web/Dockerfile</code></pre>`,
            ).en}
          </li>
          <li><strong>.env Content:</strong> paste the full content of your already-edited <code>.env</code> (with your real domain, passwords and secrets).</li>
          <li><strong>Confirm.</strong> aaPanel runs the equivalent of <code>docker compose up -d --build</code> — you'll see the build progress and, once done, the status of the 3 containers (<code>db</code>, <code>api</code>, <code>web</code>) in the Container tab.</li>
        </ol>
        ${callout(
          "tip",
          "",
          "What's 'Template List' for?",
          "",
          "<p>It's just for saving reusable composes across projects (by checking \"Also Save as Template\" when creating one) — not needed to install enMail, you can ignore it.</p>",
        ).en}

        <h4>Using a command (aaPanel Terminal or SSH)</h4>
        <p>If you'd rather not paste the compose by hand, this gives the same result by running it inside the project folder — no <code>context</code> issue, since it runs from the real folder:</p>
        <pre><code>cd /www/wwwroot/enmail
docker compose up -d --build</code></pre>

        <h3>4. Create the sites in aaPanel</h3>
        <p>Under <strong>Website → Add site</strong>, create two entries (two subdomains), without PHP, and enable <strong>Reverse Proxy</strong> on each:</p>
        <table>
          <tr><th>Subdomain</th><th>Proxy to</th></tr>
          <tr><td><code>mail.yourdomain.com</code></td><td><code>http://127.0.0.1:3000</code> (the <code>web</code> container)</td></tr>
          <tr><td><code>mail-api.yourdomain.com</code></td><td><code>http://127.0.0.1:3001</code> (the <code>api</code> container)</td></tr>
        </table>
        ${callout(
          "warning",
          "",
          "Proxy the whole domain, not just /api",
          "",
          `<p>If aaPanel asks for a "directory" for the reverse proxy, leave it as <code>/</code> (root), <strong>not</strong> <code>/api</code>. The API serves both <code>/api/*</code> and <code>/uploads/*</code> (logos, avatars, attachments) — if the proxy only covers <code>/api</code>, those images upload fine but then never load (404), because nginx never forwards that part to the container.</p>`,
        ).en}
        <p>Remember that <code>NEXT_PUBLIC_API_URL</code> in your <code>.env</code> must point to <code>https://mail-api.yourdomain.com/api</code> <em>before</em> running <code>docker compose up -d --build</code> (this variable gets "baked in" during the web build).</p>

        <h3>5. SSL</h3>
        <p>On each site, go to the <strong>SSL</strong> tab → <strong>Let's Encrypt</strong> → request certificate. Free, and it auto-renews.</p>

        <h2>Option B: Node.js directly (no Docker)</h2>
        <p>If you'd rather not use Docker, install the <strong>Node.js Version Manager</strong> plugin from aaPanel's App Store, and follow the <a href="manual.html">manual installation guide</a> — aaPanel lets you pick the Node version and manage the process with PM2 from its own interface instead of doing it all over SSH.</p>
      `,
    },
  },

  // --------------------------------------------------------------- cpanel
  {
    slug: "cpanel",
    title: { es: "cPanel", en: "cPanel" },
    description: {
      es: "Instalar enMail en un hosting con cPanel.",
      en: "Install enMail on cPanel hosting.",
    },
    body: {
      es: `
        <h1>cPanel</h1>
        <p class="lede">cPanel generalmente no ofrece Docker en planes compartidos — se instala con la herramienta <strong>Setup Node.js App</strong> (necesita que tu proveedor tenga habilitado el "Node.js Selector"/CloudLinux).</p>

        <h2>1. Crear la base de datos</h2>
        <p><strong>MySQL Databases</strong> → creá una base, un usuario, y asignale todos los privilegios sobre esa base.</p>

        <h2>2. Subir el proyecto</h2>
        <p>Por Git Version Control (si está disponible) o subiendo un .zip del repo por el Administrador de archivos, a una carpeta fuera de <code>public_html</code> (por ejemplo <code>~/enmail</code>).</p>

        <h2>3. Crear la app de la API</h2>
        <p><strong>Setup Node.js App → Create Application</strong>:</p>
        <ul>
          <li><strong>Node.js version:</strong> 20 o superior.</li>
          <li><strong>Application root:</strong> <code>enmail/apps/api</code></li>
          <li><strong>Application URL:</strong> el subdominio de la API, ej. <code>mail-api.tudominio.com</code></li>
          <li><strong>Application startup file:</strong> <code>dist/main.js</code></li>
        </ul>
        <p>En <strong>Environment variables</strong> de esa app, cargá <code>DATABASE_URL</code>, <code>JWT_SECRET</code>, <code>MAIL_ENCRYPTION_KEY</code>, <code>FRONTEND_URL</code> (ver <a href="configuration.html">Variables de entorno</a>). Guardá, y usá el botón <strong>Run NPM Install</strong>. Después, por la terminal que da cPanel (o con "Run JS script"), corré:</p>
        <pre><code>npx prisma migrate deploy
npm run db:seed
npm run build</code></pre>
        <p>Y reiniciá la app desde el botón <strong>Restart</strong>.</p>

        <h2>4. Crear la app de la Web</h2>
        <p>Otra vez <strong>Create Application</strong>:</p>
        <ul>
          <li><strong>Application root:</strong> <code>enmail/apps/web</code></li>
          <li><strong>Application URL:</strong> tu dominio principal, ej. <code>mail.tudominio.com</code></li>
          <li><strong>Application startup file:</strong> dejalo como sugiere cPanel (usa <code>npm start</code> internamente).</li>
        </ul>
        <p>Variable de entorno necesaria: <code>NEXT_PUBLIC_API_URL=https://mail-api.tudominio.com/api</code>. Con <strong>Run NPM Install</strong> y después, por terminal:</p>
        <pre><code>npm run build</code></pre>
        <p>Reiniciá la app.</p>

        ${callout(
          "warning",
          "Orden importa",
          "Order matters",
          "<p><code>NEXT_PUBLIC_API_URL</code> tiene que estar configurada <strong>antes</strong> de correr <code>npm run build</code> en la web — Next.js la incrusta en el código en ese momento, cambiarla después no tiene efecto hasta reconstruir.</p>",
          "",
        ).es}

        <h2>5. SSL</h2>
        <p><strong>SSL/TLS Status</strong> → activá AutoSSL para ambos subdominios.</p>
      `,
      en: `
        <h1>cPanel</h1>
        <p class="lede">cPanel usually doesn't offer Docker on shared plans — install it using the <strong>Setup Node.js App</strong> tool (requires your provider to have the "Node.js Selector"/CloudLinux enabled).</p>

        <h2>1. Create the database</h2>
        <p><strong>MySQL Databases</strong> → create a database, a user, and grant it all privileges on that database.</p>

        <h2>2. Upload the project</h2>
        <p>Via Git Version Control (if available) or by uploading a .zip of the repo through File Manager, into a folder outside <code>public_html</code> (e.g. <code>~/enmail</code>).</p>

        <h2>3. Create the API app</h2>
        <p><strong>Setup Node.js App → Create Application</strong>:</p>
        <ul>
          <li><strong>Node.js version:</strong> 20 or newer.</li>
          <li><strong>Application root:</strong> <code>enmail/apps/api</code></li>
          <li><strong>Application URL:</strong> the API subdomain, e.g. <code>mail-api.yourdomain.com</code></li>
          <li><strong>Application startup file:</strong> <code>dist/main.js</code></li>
        </ul>
        <p>In that app's <strong>Environment variables</strong>, add <code>DATABASE_URL</code>, <code>JWT_SECRET</code>, <code>MAIL_ENCRYPTION_KEY</code>, <code>FRONTEND_URL</code> (see <a href="configuration.html">Environment variables</a>). Save, then use the <strong>Run NPM Install</strong> button. Then, from the terminal cPanel provides (or "Run JS script"), run:</p>
        <pre><code>npx prisma migrate deploy
npm run db:seed
npm run build</code></pre>
        <p>And restart the app from the <strong>Restart</strong> button.</p>

        <h2>4. Create the Web app</h2>
        <p><strong>Create Application</strong> again:</p>
        <ul>
          <li><strong>Application root:</strong> <code>enmail/apps/web</code></li>
          <li><strong>Application URL:</strong> your main domain, e.g. <code>mail.yourdomain.com</code></li>
          <li><strong>Application startup file:</strong> leave whatever cPanel suggests (it uses <code>npm start</code> internally).</li>
        </ul>
        <p>Required environment variable: <code>NEXT_PUBLIC_API_URL=https://mail-api.yourdomain.com/api</code>. Use <strong>Run NPM Install</strong>, then from the terminal:</p>
        <pre><code>npm run build</code></pre>
        <p>Restart the app.</p>

        ${callout(
          "warning",
          "",
          "Order matters",
          "",
          "<p><code>NEXT_PUBLIC_API_URL</code> must be set <strong>before</strong> running <code>npm run build</code> on the web app — Next.js bakes it into the code at that point; changing it afterwards has no effect until you rebuild.</p>",
        ).en}

        <h2>5. SSL</h2>
        <p><strong>SSL/TLS Status</strong> → enable AutoSSL for both subdomains.</p>
      `,
    },
  },

  // ---------------------------------------------------------------- plesk
  {
    slug: "plesk",
    title: { es: "Plesk", en: "Plesk" },
    description: {
      es: "Instalar enMail en un hosting con Plesk.",
      en: "Install enMail on Plesk hosting.",
    },
    body: {
      es: `
        <h1>Plesk</h1>
        <p class="lede">Plesk tiene una extensión de <strong>Node.js</strong> equivalente a la de cPanel. Si tu Plesk tiene la extensión Docker, también podés seguir el mismo enfoque que en <a href="aapanel.html">aaPanel</a> (Docker + proxy reverso).</p>

        <h2>1. Base de datos</h2>
        <p><strong>Sitios web y dominios → Bases de datos</strong> → creá una base MySQL y un usuario con todos los permisos.</p>

        <h2>2. Subir el proyecto</h2>
        <p>Por Git (Plesk tiene integración de Git) o subiendo los archivos por el Administrador de Archivos, en un dominio/subdominio.</p>

        <h2>3. Configurar la app de la API</h2>
        <p>En el dominio/subdominio de la API (ej. <code>mail-api.tudominio.com</code>), pestaña <strong>Node.js</strong>:</p>
        <ul>
          <li><strong>Document root:</strong> <code>apps/api</code></li>
          <li><strong>Application startup file:</strong> <code>dist/main.js</code></li>
          <li><strong>Versión de Node.js:</strong> 20+</li>
        </ul>
        <p>Cargá las variables de entorno (<code>DATABASE_URL</code>, <code>JWT_SECRET</code>, <code>MAIL_ENCRYPTION_KEY</code>, <code>FRONTEND_URL</code> — ver <a href="configuration.html">Variables de entorno</a>), y usá <strong>NPM install</strong>. Con acceso SSH, corré:</p>
        <pre><code>npx prisma migrate deploy
npm run db:seed
npm run build</code></pre>
        <p>Reiniciá la app Node desde Plesk.</p>

        <h2>4. Configurar la app de la Web</h2>
        <p>En tu dominio principal, pestaña <strong>Node.js</strong>, con <strong>Document root</strong> apuntando a <code>apps/web</code>. Variable de entorno: <code>NEXT_PUBLIC_API_URL=https://mail-api.tudominio.com/api</code> (definila antes de compilar). <strong>NPM install</strong> y luego, por SSH:</p>
        <pre><code>npm run build</code></pre>
        <p>Reiniciá.</p>

        <h2>5. SSL</h2>
        <p><strong>Sitios web y dominios → Certificados SSL/TLS</strong> → Let's Encrypt, para ambos dominios/subdominios.</p>
      `,
      en: `
        <h1>Plesk</h1>
        <p class="lede">Plesk has a <strong>Node.js</strong> extension equivalent to cPanel's. If your Plesk instance has the Docker extension, you can also follow the same approach as <a href="aapanel.html">aaPanel</a> (Docker + reverse proxy).</p>

        <h2>1. Database</h2>
        <p><strong>Websites & Domains → Databases</strong> → create a MySQL database and a user with full permissions.</p>

        <h2>2. Upload the project</h2>
        <p>Via Git (Plesk has Git integration) or by uploading the files through File Manager, into a domain/subdomain.</p>

        <h2>3. Set up the API app</h2>
        <p>On the API's domain/subdomain (e.g. <code>mail-api.yourdomain.com</code>), <strong>Node.js</strong> tab:</p>
        <ul>
          <li><strong>Document root:</strong> <code>apps/api</code></li>
          <li><strong>Application startup file:</strong> <code>dist/main.js</code></li>
          <li><strong>Node.js version:</strong> 20+</li>
        </ul>
        <p>Add the environment variables (<code>DATABASE_URL</code>, <code>JWT_SECRET</code>, <code>MAIL_ENCRYPTION_KEY</code>, <code>FRONTEND_URL</code> — see <a href="configuration.html">Environment variables</a>), and use <strong>NPM install</strong>. With SSH access, run:</p>
        <pre><code>npx prisma migrate deploy
npm run db:seed
npm run build</code></pre>
        <p>Restart the Node app from Plesk.</p>

        <h2>4. Set up the Web app</h2>
        <p>On your main domain, <strong>Node.js</strong> tab, with <strong>Document root</strong> pointing to <code>apps/web</code>. Environment variable: <code>NEXT_PUBLIC_API_URL=https://mail-api.yourdomain.com/api</code> (set it before building). <strong>NPM install</strong>, then over SSH:</p>
        <pre><code>npm run build</code></pre>
        <p>Restart.</p>

        <h2>5. SSL</h2>
        <p><strong>Websites & Domains → SSL/TLS Certificates</strong> → Let's Encrypt, for both domains/subdomains.</p>
      `,
    },
  },

  // ----------------------------------------------------------- hostinger
  {
    slug: "hostinger",
    title: { es: "Hostinger / VPS", en: "Hostinger / VPS" },
    description: {
      es: "Instalar enMail en Hostinger u otro VPS.",
      en: "Install enMail on Hostinger or another VPS.",
    },
    body: {
      es: `
        <h1>Hostinger y otros VPS</h1>
        <p class="lede">Los planes de hosting <strong>compartido</strong> (incluido el hPanel de Hostinger sobre hosting compartido) no dan acceso a Docker ni permiten procesos Node.js de larga duración de forma confiable — para enMail hace falta un <strong>VPS</strong> (Hostinger VPS, DigitalOcean, Vultr, etc.) con acceso root/SSH.</p>

        <h2>Con un VPS de Hostinger (o cualquier otro)</h2>
        <p>Un VPS es un servidor Linux normal — seguí directamente la <a href="docker.html">guía de instalación con Docker</a>, que es el camino recomendado. Resumen:</p>
        <ol>
          <li>Conectate por SSH al VPS.</li>
          <li>Instalá Docker: <code>curl -fsSL https://get.docker.com | sh</code></li>
          <li>Cloná el repo, configurá <code>.env</code>, y corré <code>docker compose up -d --build</code>.</li>
          <li>Apuntá tu dominio (DNS tipo A) a la IP del VPS, y agregá un proxy reverso con Nginx (ver el ejemplo en la <a href="manual.html">guía manual</a>) o instalá un panel como aaPanel/CyberPanel encima para manejar el dominio y el SSL más cómodo.</li>
        </ol>

        <h2>Firewall</h2>
        <p>Si vas a exponer los puertos 3000/3001 directo (sin proxy reverso todavía, solo para probar), asegurate de abrirlos en el firewall del proveedor (en hPanel: <strong>VPS → Firewall</strong>) además del firewall del sistema operativo (<code>ufw</code>/<code>firewalld</code>).</p>

        ${callout(
          "warning",
          "Hosting compartido",
          "Shared hosting",
          "<p>Si solo tenés un plan de hosting compartido (no VPS), no vas a poder correr enMail ahí — necesitás upgradear a un plan VPS o usar otro proveedor con acceso root.</p>",
          "<p>If you only have a shared hosting plan (not VPS), you won't be able to run enMail there — you'll need to upgrade to a VPS plan or use another provider with root access.</p>",
        ).es}
      `,
      en: `
        <h1>Hostinger and other VPS providers</h1>
        <p class="lede"><strong>Shared</strong> hosting plans (including Hostinger's hPanel over shared hosting) don't give access to Docker or reliably allow long-running Node.js processes — enMail needs a <strong>VPS</strong> (Hostinger VPS, DigitalOcean, Vultr, etc.) with root/SSH access.</p>

        <h2>With a Hostinger VPS (or any other)</h2>
        <p>A VPS is a regular Linux server — just follow the <a href="docker.html">Docker installation guide</a> directly, which is the recommended path. Summary:</p>
        <ol>
          <li>Connect to the VPS over SSH.</li>
          <li>Install Docker: <code>curl -fsSL https://get.docker.com | sh</code></li>
          <li>Clone the repo, configure <code>.env</code>, and run <code>docker compose up -d --build</code>.</li>
          <li>Point your domain (A record) at the VPS's IP, and add an Nginx reverse proxy (see the example in the <a href="manual.html">manual guide</a>) or install a panel like aaPanel/CyberPanel on top to manage the domain and SSL more comfortably.</li>
        </ol>

        <h2>Firewall</h2>
        <p>If you're going to expose ports 3000/3001 directly (without a reverse proxy yet, just to try it out), make sure to open them in the provider's firewall (in hPanel: <strong>VPS → Firewall</strong>) as well as the OS firewall (<code>ufw</code>/<code>firewalld</code>).</p>

        ${callout(
          "warning",
          "",
          "Shared hosting",
          "",
          "<p>If you only have a shared hosting plan (not VPS), you won't be able to run enMail there — you'll need to upgrade to a VPS plan or use another provider with root access.</p>",
        ).en}
      `,
    },
  },

  // ---------------------------------------------------------- configuration
  {
    slug: "configuration",
    title: { es: "Variables de entorno", en: "Environment variables" },
    description: {
      es: "Referencia completa de todas las variables de entorno.",
      en: "Full reference of all environment variables.",
    },
    body: {
      es: `
        <h1>Variables de entorno</h1>
        <p class="lede">Si instalaste con Docker, todas estas variables se configuran en un solo archivo <code>.env</code> en la raíz del proyecto. Si instalaste manualmente, van repartidas entre <code>apps/api/.env</code> y <code>apps/web/.env.local</code> (se indica en cada fila).</p>

        <h2>Base de datos</h2>
        <table>
          <tr><th>Variable</th><th>Dónde</th><th>Descripción</th></tr>
          <tr><td><code>DATABASE_URL</code></td><td>API</td><td>Cadena de conexión MySQL completa: <code>mysql://usuario:password@host:puerto/base</code>.</td></tr>
          <tr><td><code>MYSQL_ROOT_PASSWORD</code></td><td>Solo Docker</td><td>Contraseña root del contenedor de MySQL.</td></tr>
          <tr><td><code>MYSQL_DATABASE</code></td><td>Solo Docker</td><td>Nombre de la base que se crea automáticamente.</td></tr>
          <tr><td><code>MYSQL_USER</code> / <code>MYSQL_PASSWORD</code></td><td>Solo Docker</td><td>Usuario/contraseña que usa la API para conectarse (arma el <code>DATABASE_URL</code> interno solo).</td></tr>
        </table>

        <h2>Seguridad</h2>
        <table>
          <tr><th>Variable</th><th>Dónde</th><th>Descripción</th></tr>
          <tr><td><code>JWT_SECRET</code></td><td>API</td><td>Clave para firmar las sesiones (JWT). Generala con <code>openssl rand -hex 32</code>.</td></tr>
          <tr><td><code>JWT_EXPIRES_IN</code></td><td>API</td><td>Duración de la sesión en segundos (86400 = 24 horas).</td></tr>
          <tr><td><code>MAIL_ENCRYPTION_KEY</code></td><td>API</td><td>Exactamente 32 caracteres. Cifra en reposo las contraseñas/tokens de las cuentas de correo guardadas.</td></tr>
        </table>

        <h2>URLs</h2>
        <table>
          <tr><th>Variable</th><th>Dónde</th><th>Descripción</th></tr>
          <tr><td><code>FRONTEND_URL</code></td><td>API</td><td>URL pública del frontend — se usa para armar los redirects de OAuth (Gmail/Outlook) y CORS.</td></tr>
          <tr><td><code>NEXT_PUBLIC_API_URL</code></td><td>Web</td><td>URL pública de la API, con <code>/api</code> al final. <strong>Se incrusta en el build</strong> — cambiarla requiere reconstruir la web.</td></tr>
          <tr><td><code>PORT</code></td><td>API</td><td>Puerto donde escucha la API. Por defecto 3001.</td></tr>
        </table>

        <h2>Sembrado inicial (opcional)</h2>
        <table>
          <tr><th>Variable</th><th>Dónde</th><th>Descripción</th></tr>
          <tr><td><code>SEED_ADMIN_EMAIL</code></td><td>API</td><td>Email del usuario administrador creado la primera vez. Por defecto <code>admin@webmail.local</code>.</td></tr>
          <tr><td><code>SEED_ADMIN_PASSWORD</code></td><td>API</td><td>Contraseña del administrador. Por defecto <code>admin12345</code> — cambiala.</td></tr>
        </table>

        ${callout(
          "tip",
          "Generar secretos",
          "Generating secrets",
          "<p>Para <code>JWT_SECRET</code>: <code>openssl rand -hex 32</code>. Para <code>MAIL_ENCRYPTION_KEY</code> (debe medir 32 caracteres exactos): <code>openssl rand -hex 16</code> te da 32 caracteres hexadecimales.</p>",
          "<p>For <code>JWT_SECRET</code>: <code>openssl rand -hex 32</code>. For <code>MAIL_ENCRYPTION_KEY</code> (must be exactly 32 characters): <code>openssl rand -hex 16</code> gives you 32 hex characters.</p>",
        ).es}
      `,
      en: `
        <h1>Environment variables</h1>
        <p class="lede">If you installed with Docker, all of these are configured in a single <code>.env</code> file at the project root. If you installed manually, they're split between <code>apps/api/.env</code> and <code>apps/web/.env.local</code> (noted in each row).</p>

        <h2>Database</h2>
        <table>
          <tr><th>Variable</th><th>Where</th><th>Description</th></tr>
          <tr><td><code>DATABASE_URL</code></td><td>API</td><td>Full MySQL connection string: <code>mysql://user:password@host:port/database</code>.</td></tr>
          <tr><td><code>MYSQL_ROOT_PASSWORD</code></td><td>Docker only</td><td>Root password for the MySQL container.</td></tr>
          <tr><td><code>MYSQL_DATABASE</code></td><td>Docker only</td><td>Name of the database created automatically.</td></tr>
          <tr><td><code>MYSQL_USER</code> / <code>MYSQL_PASSWORD</code></td><td>Docker only</td><td>User/password the API uses to connect (builds the internal <code>DATABASE_URL</code> for you).</td></tr>
        </table>

        <h2>Security</h2>
        <table>
          <tr><th>Variable</th><th>Where</th><th>Description</th></tr>
          <tr><td><code>JWT_SECRET</code></td><td>API</td><td>Key used to sign sessions (JWT). Generate with <code>openssl rand -hex 32</code>.</td></tr>
          <tr><td><code>JWT_EXPIRES_IN</code></td><td>API</td><td>Session duration in seconds (86400 = 24 hours).</td></tr>
          <tr><td><code>MAIL_ENCRYPTION_KEY</code></td><td>API</td><td>Exactly 32 characters. Encrypts saved mail account passwords/tokens at rest.</td></tr>
        </table>

        <h2>URLs</h2>
        <table>
          <tr><th>Variable</th><th>Where</th><th>Description</th></tr>
          <tr><td><code>FRONTEND_URL</code></td><td>API</td><td>Public frontend URL — used to build OAuth redirects (Gmail/Outlook) and CORS.</td></tr>
          <tr><td><code>NEXT_PUBLIC_API_URL</code></td><td>Web</td><td>Public API URL, ending in <code>/api</code>. <strong>Baked into the build</strong> — changing it requires rebuilding the web app.</td></tr>
          <tr><td><code>PORT</code></td><td>API</td><td>Port the API listens on. Defaults to 3001.</td></tr>
        </table>

        <h2>Initial seed (optional)</h2>
        <table>
          <tr><th>Variable</th><th>Where</th><th>Description</th></tr>
          <tr><td><code>SEED_ADMIN_EMAIL</code></td><td>API</td><td>Email of the admin user created on first run. Defaults to <code>admin@webmail.local</code>.</td></tr>
          <tr><td><code>SEED_ADMIN_PASSWORD</code></td><td>API</td><td>Admin password. Defaults to <code>admin12345</code> — change it.</td></tr>
        </table>

        ${callout(
          "tip",
          "",
          "Generating secrets",
          "",
          "<p>For <code>JWT_SECRET</code>: <code>openssl rand -hex 32</code>. For <code>MAIL_ENCRYPTION_KEY</code> (must be exactly 32 characters): <code>openssl rand -hex 16</code> gives you 32 hex characters.</p>",
        ).en}
      `,
    },
  },

  // --------------------------------------------------------- connectors
  {
    slug: "connectors",
    title: { es: "Conectores Gmail/Outlook", en: "Gmail/Outlook connectors" },
    description: {
      es: "Cómo crear las apps OAuth de Google y Microsoft para conectar Gmail/Outlook.",
      en: "How to create the Google and Microsoft OAuth apps to connect Gmail/Outlook.",
    },
    body: {
      es: `
        <h1>Conectores Gmail/Outlook</h1>
        <p class="lede">Con esto, tus usuarios pueden agregar una cuenta de Gmail u Outlook con el botón "Conectar con Google/Microsoft" (sin contraseña de aplicación) en vez de configurar IMAP/SMTP a mano. Hace falta que <strong>vos, como admin</strong>, crees una app OAuth en cada proveedor una sola vez y cargues sus datos en <strong>Ajustes → Conectores externos</strong>.</p>

        ${callout(
          "tip",
          "¿Es obligatorio?",
          "",
          "<p>No. Si no configurás esto, enMail funciona igual — tus usuarios simplemente no van a ver el botón de Gmail/Outlook al agregar una cuenta, pero sí pueden seguir agregando cualquier cuenta IMAP/SMTP a mano (incluido Gmail/Outlook, generando una \"contraseña de aplicación\" del lado de ellos).</p>",
          "",
        ).es}

        <h2>Gmail (Google Cloud Console)</h2>
        <ol>
          <li>Entrá a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</a> y creá un proyecto nuevo (o usá uno existente).</li>
          <li><strong>APIs & Services → Library</strong> → buscá <strong>Gmail API</strong> → <strong>Enable</strong>.</li>
          <li><strong>APIs & Services → OAuth consent screen</strong>:
            <ul>
              <li>Tipo: <strong>External</strong> (a menos que uses Google Workspace y quieras limitarlo a tu organización, ahí elegís <strong>Internal</strong>).</li>
              <li>Completá nombre de la app, email de soporte y de contacto.</li>
              <li>En <strong>Scopes</strong>, agregá <code>https://mail.google.com/</code> (acceso completo a IMAP/SMTP).</li>
              <li>Si el consent screen queda en modo "Testing", agregá los emails de tus usuarios como <strong>Test users</strong> — si no, Google les va a bloquear el login. Para que cualquiera pueda conectar sin esa lista, hay que mandar la app a verificación de Google (proceso aparte, no obligatorio para uso interno).</li>
            </ul>
          </li>
          <li><strong>APIs & Services → Credentials → Create Credentials → OAuth client ID</strong>:
            <ul>
              <li>Application type: <strong>Web application</strong>.</li>
              <li><strong>Authorized redirect URIs</strong>, agregá exactamente:
                <pre><code>https://mail-api.tudominio.com/api/oauth/gmail/callback</code></pre>
                (reemplazá por el dominio real de tu API — ver <a href="docker.html">Instalación</a>).
              </li>
            </ul>
          </li>
          <li>Guardá el <strong>Client ID</strong> y <strong>Client Secret</strong> que te muestra Google.</li>
        </ol>

        <h2>Outlook / Microsoft 365 (Azure Portal)</h2>
        <ol>
          <li>Entrá a <a href="https://portal.azure.com/" target="_blank" rel="noopener">portal.azure.com</a> → <strong>Microsoft Entra ID</strong> → <strong>App registrations</strong> → <strong>New registration</strong>.</li>
          <li><strong>Supported account types</strong>: elegí "Accounts in any organizational directory and personal Microsoft accounts" (para que funcione tanto con cuentas de Microsoft 365 como personales de Outlook.com).</li>
          <li><strong>Redirect URI</strong>: tipo <strong>Web</strong>, valor exacto:
            <pre><code>https://mail-api.tudominio.com/api/oauth/outlook/callback</code></pre>
          </li>
          <li>Ya creada la app, andá a <strong>API permissions → Add a permission</strong>:
            <ul>
              <li><strong>APIs my organization uses</strong> → buscá <strong>Office 365 Exchange Online</strong> → <strong>Delegated permissions</strong> → agregá <code>IMAP.AccessAsUser.All</code> y <code>SMTP.Send</code>.</li>
              <li>También agregá los permisos delegados estándar <strong>Microsoft Graph</strong>: <code>openid</code>, <code>email</code>, <code>profile</code>, <code>offline_access</code>.</li>
            </ul>
          </li>
          <li><strong>Certificates & secrets → New client secret</strong> → copiá el <strong>Value</strong> apenas se genera (no se vuelve a mostrar).</li>
          <li>El <strong>Client ID</strong> (Application ID) está en la página <strong>Overview</strong> de la app.</li>
        </ol>

        <h2>Cargar los datos en enMail</h2>
        <p>Como admin, andá a <strong>Ajustes → Conectores externos</strong>, elegí Gmail u Outlook, y completá:</p>
        <table>
          <tr><th>Campo</th><th>Valor</th></tr>
          <tr><td>Client ID</td><td>El que copiaste de Google/Azure</td></tr>
          <tr><td>Client Secret</td><td>El que copiaste de Google/Azure</td></tr>
          <tr><td>Redirect URI</td><td>La misma URL exacta que registraste arriba</td></tr>
        </table>
        <p>Activá el conector y guardá. Tus usuarios ya van a ver el botón correspondiente al agregar una cuenta.</p>

        ${callout(
          "warning",
          "El Redirect URI tiene que ser idéntico",
          "",
          "<p>Google y Microsoft comparan la URL de redirect carácter por carácter (incluyendo <code>https://</code> vs <code>http://</code>, con o sin barra final). Si no coincide exactamente con lo que cargaste en enMail, el login va a fallar con un error de \"redirect_uri_mismatch\".</p>",
          "",
        ).es}
      `,
      en: `
        <h1>Gmail/Outlook connectors</h1>
        <p class="lede">With this set up, your users can add a Gmail or Outlook account with a "Connect with Google/Microsoft" button (no app password needed) instead of configuring IMAP/SMTP by hand. You, the admin, need to create an OAuth app with each provider once and enter its details in <strong>Settings → Connectors</strong>.</p>

        ${callout(
          "tip",
          "",
          "Is this required?",
          "",
          "<p>No. Without this, enMail still works fine — your users just won't see the Gmail/Outlook button when adding an account, but they can still add any IMAP/SMTP account by hand (including Gmail/Outlook, by generating an &quot;app password&quot; on their end).</p>",
        ).en}

        <h2>Gmail (Google Cloud Console)</h2>
        <ol>
          <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</a> and create a new project (or use an existing one).</li>
          <li><strong>APIs & Services → Library</strong> → search for <strong>Gmail API</strong> → <strong>Enable</strong>.</li>
          <li><strong>APIs & Services → OAuth consent screen</strong>:
            <ul>
              <li>Type: <strong>External</strong> (unless you're on Google Workspace and want to restrict it to your org, then pick <strong>Internal</strong>).</li>
              <li>Fill in the app name, support email and contact email.</li>
              <li>Under <strong>Scopes</strong>, add <code>https://mail.google.com/</code> (full IMAP/SMTP access).</li>
              <li>If the consent screen is left in "Testing" mode, add your users' emails as <strong>Test users</strong> — otherwise Google will block their login. To let anyone connect without that list, the app needs to go through Google's verification process (separate, not required for internal use).</li>
            </ul>
          </li>
          <li><strong>APIs & Services → Credentials → Create Credentials → OAuth client ID</strong>:
            <ul>
              <li>Application type: <strong>Web application</strong>.</li>
              <li>Under <strong>Authorized redirect URIs</strong>, add exactly:
                <pre><code>https://mail-api.yourdomain.com/api/oauth/gmail/callback</code></pre>
                (use your API's real domain — see <a href="docker.html">Installation</a>).
              </li>
            </ul>
          </li>
          <li>Save the <strong>Client ID</strong> and <strong>Client Secret</strong> Google shows you.</li>
        </ol>

        <h2>Outlook / Microsoft 365 (Azure Portal)</h2>
        <ol>
          <li>Go to <a href="https://portal.azure.com/" target="_blank" rel="noopener">portal.azure.com</a> → <strong>Microsoft Entra ID</strong> → <strong>App registrations</strong> → <strong>New registration</strong>.</li>
          <li><strong>Supported account types</strong>: choose "Accounts in any organizational directory and personal Microsoft accounts" (so it works with both Microsoft 365 and personal Outlook.com accounts).</li>
          <li><strong>Redirect URI</strong>: type <strong>Web</strong>, exact value:
            <pre><code>https://mail-api.yourdomain.com/api/oauth/outlook/callback</code></pre>
          </li>
          <li>Once the app is created, go to <strong>API permissions → Add a permission</strong>:
            <ul>
              <li><strong>APIs my organization uses</strong> → search for <strong>Office 365 Exchange Online</strong> → <strong>Delegated permissions</strong> → add <code>IMAP.AccessAsUser.All</code> and <code>SMTP.Send</code>.</li>
              <li>Also add the standard <strong>Microsoft Graph</strong> delegated permissions: <code>openid</code>, <code>email</code>, <code>profile</code>, <code>offline_access</code>.</li>
            </ul>
          </li>
          <li><strong>Certificates & secrets → New client secret</strong> → copy the <strong>Value</strong> as soon as it's generated (it won't be shown again).</li>
          <li>The <strong>Client ID</strong> (Application ID) is on the app's <strong>Overview</strong> page.</li>
        </ol>

        <h2>Entering the details in enMail</h2>
        <p>As an admin, go to <strong>Settings → Connectors</strong>, pick Gmail or Outlook, and fill in:</p>
        <table>
          <tr><th>Field</th><th>Value</th></tr>
          <tr><td>Client ID</td><td>The one you copied from Google/Azure</td></tr>
          <tr><td>Client Secret</td><td>The one you copied from Google/Azure</td></tr>
          <tr><td>Redirect URI</td><td>The exact same URL you registered above</td></tr>
        </table>
        <p>Enable the connector and save. Your users will now see the corresponding button when adding an account.</p>

        ${callout(
          "warning",
          "",
          "The Redirect URI must match exactly",
          "",
          "<p>Google and Microsoft compare the redirect URL character by character (including <code>https://</code> vs <code>http://</code>, with or without a trailing slash). If it doesn't exactly match what you entered in enMail, login will fail with a &quot;redirect_uri_mismatch&quot; error.</p>",
        ).en}
      `,
    },
  },

  // ----------------------------------------------------------------- faq
  {
    slug: "faq",
    title: { es: "Preguntas frecuentes", en: "FAQ" },
    description: {
      es: "Dudas comunes sobre la instalación y el uso de enMail.",
      en: "Common questions about installing and using enMail.",
    },
    body: {
      es: `
        <h1>Preguntas frecuentes</h1>

        <h3>¿Es gratis? ¿Puedo usarlo en un proyecto comercial?</h3>
        <p>Sí. enMail se publica bajo licencia MIT: podés usarlo, modificarlo y hasta venderlo como parte de otro producto, sin restricciones.</p>

        <h3>¿Necesito instalar un servidor de correo aparte?</h3>
        <p>Sí — enMail es el <em>cliente</em> web (como Roundcube), no un servidor IMAP/SMTP. Necesitás uno ya funcionando (el que te da tu hosting con cPanel/aaPanel/Plesk, o cualquier otro proveedor).</p>

        <h3>¿Puedo usar PostgreSQL en vez de MySQL?</h3>
        <p>Por ahora no — la base de datos de la aplicación (usuarios, preferencias, cache de mensajes) es MySQL únicamente.</p>

        <h3>¿Cómo conecto Gmail/Outlook con OAuth?</h3>
        <p>Como administrador, andá a <strong>Ajustes → Conectores</strong> y cargá el Client ID/Secret de una app OAuth creada en Google Cloud Console o Azure Portal. Una vez activado el conector, tus usuarios van a ver el botón "Conectar con Google/Microsoft" al agregar una cuenta.</p>

        <h3>¿Dónde se guardan los archivos subidos (logos, avatares, adjuntos)?</h3>
        <p>En la carpeta <code>apps/api/uploads/</code>. Con Docker, esa carpeta vive en el volumen <code>api-uploads</code> — no se pierde al reconstruir los contenedores, pero conviene incluirla en tus backups.</p>

        <h3>Error "Can't reach database server"</h3>
        <p>Con Docker: revisá que el contenedor <code>db</code> esté <code>healthy</code> (<code>docker compose ps</code>) y que <code>DATABASE_URL</code> use <code>db</code> como host (no <code>localhost</code>). En instalación manual: confirmá que MySQL esté corriendo y que el usuario/contraseña de <code>DATABASE_URL</code> sean correctos.</p>

        <h3>Cambié <code>NEXT_PUBLIC_API_URL</code> y no pasó nada</h3>
        <p>Esa variable se incrusta en el código en el momento del <code>build</code> de la web, no se lee en tiempo de ejecución. Después de cambiarla hay que reconstruir: <code>docker compose up -d --build web</code> (Docker) o <code>npm run build</code> de nuevo en <code>apps/web</code> (instalación manual).</p>

        <h3>¿Cómo actualizo a una versión nueva?</h3>
        <p><code>git pull</code> y, con Docker, <code>docker compose up -d --build</code>. Con instalación manual, repetí el paso de build de ambas apps y reiniciá los procesos de PM2.</p>

        <h3>¿Dónde reporto un problema?</h3>
        <p>En los <a href="https://github.com/retsill/enmail/issues" target="_blank" rel="noopener">Issues de GitHub</a> del proyecto.</p>
      `,
      en: `
        <h1>Frequently asked questions</h1>

        <h3>Is it free? Can I use it in a commercial project?</h3>
        <p>Yes. enMail is published under the MIT license: you can use, modify and even sell it as part of another product, with no restrictions.</p>

        <h3>Do I need to install a separate mail server?</h3>
        <p>Yes — enMail is the web <em>client</em> (like Roundcube), not an IMAP/SMTP server. You need one already running (the one your cPanel/aaPanel/Plesk hosting gives you, or any other provider).</p>

        <h3>Can I use PostgreSQL instead of MySQL?</h3>
        <p>Not currently — the application database (users, preferences, message cache) is MySQL only.</p>

        <h3>How do I connect Gmail/Outlook via OAuth?</h3>
        <p>As an admin, go to <strong>Settings → Connectors</strong> and enter the Client ID/Secret of an OAuth app created in Google Cloud Console or Azure Portal. Once the connector is enabled, your users will see the "Connect with Google/Microsoft" button when adding an account.</p>

        <h3>Where are uploaded files (logos, avatars, attachments) stored?</h3>
        <p>In the <code>apps/api/uploads/</code> folder. With Docker, that folder lives in the <code>api-uploads</code> volume — it survives rebuilding the containers, but you should still include it in your backups.</p>

        <h3>"Can't reach database server" error</h3>
        <p>With Docker: check that the <code>db</code> container is <code>healthy</code> (<code>docker compose ps</code>) and that <code>DATABASE_URL</code> uses <code>db</code> as the host (not <code>localhost</code>). On a manual install: confirm MySQL is running and that the user/password in <code>DATABASE_URL</code> are correct.</p>

        <h3>I changed <code>NEXT_PUBLIC_API_URL</code> and nothing happened</h3>
        <p>That variable gets baked into the code at web <code>build</code> time, it's not read at runtime. After changing it you need to rebuild: <code>docker compose up -d --build web</code> (Docker) or run <code>npm run build</code> again in <code>apps/web</code> (manual install).</p>

        <h3>How do I update to a new version?</h3>
        <p><code>git pull</code>, then with Docker: <code>docker compose up -d --build</code>. With a manual install, repeat the build step for both apps and restart the PM2 processes.</p>

        <h3>Where do I report an issue?</h3>
        <p>On the project's <a href="https://github.com/retsill/enmail/issues" target="_blank" rel="noopener">GitHub Issues</a>.</p>
      `,
    },
  },
];
