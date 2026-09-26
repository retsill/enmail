# Plan de Trabajo — Webmail Propio (Roundcube Moderno)

## 1. Resumen del proyecto

Cliente de correo web instalable, con interfaz moderna y empresarial, que se conecta al servidor IMAP/SMTP del cliente. El **core es gratuito**, y los **add-ons de conexión externa** (Gmail, Yahoo, Outlook) se activan mediante licencia comprada en **dev.xcodevs.com**. Instalación 100% vía navegador, sin tocar consola, con opción de base de datos **MySQL o PostgreSQL** elegida por el usuario final.

------

## 2. Decisiones de arquitectura clave

### 2.1 Base de datos dual (MySQL / PostgreSQL)

Para soportar ambos motores sin duplicar lógica, se usará un **ORM agnóstico de base de datos**:

- **Prisma ORM** (recomendado) — soporta MySQL y PostgreSQL con el mismo modelo de datos; solo cambia el `provider` en el schema.
- Alternativa: **TypeORM** (más flexible si luego se quiere agregar SQLite para instalaciones pequeñas de prueba).

El instalador web generará el archivo de configuración de conexión (`.env`) según la elección del usuario, y correrá las migraciones automáticamente contra el motor elegido.

### 2.2 Instalador web (estilo WordPress/Roundcube)

Wizard de 5 pasos, accesible en `/install` la primera vez que se levanta la app:

1. **Bienvenida y requisitos** — verifica versión de PHP/Node, permisos de carpetas, extensiones necesarias.
2. **Selección de base de datos** — radio button MySQL / PostgreSQL, formulario de host, puerto, usuario, contraseña, nombre de DB. Botón "Probar conexión" antes de continuar.
3. **Configuración del servidor de correo** — host IMAP, host SMTP, puertos, TLS/SSL.
4. **Cuenta de administrador** — nombre, correo, contraseña del primer admin.
5. **Confirmación e instalación** — corre migraciones, crea tablas, genera claves de seguridad (JWT secret, encriptación de contraseñas de cuentas de correo), bloquea el instalador (renombra o elimina `/install` como hace WordPress con `wp-config.php`).

Al finalizar, redirige al login normal.

### 2.3 Sistema de licencias (add-ons de pago)

- El **core** (bandeja de entrada, lectura, redacción, carpetas, búsqueda, adjuntos, contra el servidor de correo propio) es **gratuito y sin licencia**.
- Los **add-ons** (conectores Gmail API, Microsoft Graph/Outlook, Yahoo IMAP-OAuth, futuros: calendario, chat, etc.) requieren una **clave de licencia validada contra dev.xcodevs.com**.
- Flujo: el admin instala el add-on (subir `.zip` del plugin o instalar desde un marketplace interno) → ingresa su clave de licencia → la app hace una llamada a la API de dev.xcodevs.com para validar (dominio, vigencia, tipo de plan) → si es válida, el add-on se activa; si no, queda visible pero bloqueado con botón "Comprar licencia" que enlaza a la tienda.
- Se recomienda validación periódica (cada X días) con modo de gracia offline, para que no se caiga el add-on si dev.xcodevs.com está temporalmente inaccesible.

------

## 3. Stack técnico

| Capa             | Tecnología                                           |
| :--------------- | :--------------------------------------------------- |
| Frontend         | Next.js + Tailwind CSS + shadcn/ui                   |
| Backend          | NestJS (Node.js)                                     |
| ORM              | Prisma (MySQL / PostgreSQL intercambiable)           |
| Protocolo correo | imapflow + nodemailer                                |
| Add-ons externos | Gmail API, Microsoft Graph API, IMAP OAuth (Yahoo)   |
| Licencias        | API REST propia en dev.xcodevs.com + SDK cliente     |
| Cache / colas    | Redis (sincronización en background, notificaciones) |
| Despliegue       | Docker Compose + instalador web propio               |

------

## 4. Fases del proyecto

### Fase 0 — Preparación (1-2 semanas)

- Definir modelo de datos (usuarios, cuentas de correo, mensajes cacheados, carpetas, licencias de add-ons).
- Definir arquitectura de plugins/add-ons (interfaz común `connect()`, `sync()`, `send()`, `fetchMessages()`).
- Setup de repositorios, CI/CD, entorno Docker de desarrollo.

### Fase 1 — Core del webmail (5-7 semanas)

- Autenticación y sesión de administrador/usuarios.
- Conexión IMAP/SMTP contra servidor propio del cliente.
- Bandeja de entrada, lectura de correo, redacción, responder/reenviar.
- Carpetas, etiquetas, búsqueda, adjuntos.
- Diseño visual "empresarial moderno" (dashboard limpio, modo oscuro/claro, responsive).

### Fase 2 — Instalador web (2-3 semanas)

- Wizard de instalación (los 5 pasos descritos en 2.2).
- Selector de motor de base de datos + migraciones automáticas para ambos.
- Validaciones de conexión y manejo de errores amigable.

### Fase 3 — Sistema de licencias y marketplace de add-ons (3-4 semanas)

- Panel "Add-ons" dentro del admin: listado, estado (activo/bloqueado), botón de instalación.
- Integración con API de dev.xcodevs.com para validar/activar licencias.
- Empaquetado del primer add-on de referencia: **Gmail** (OAuth2 + Gmail API).

### Fase 4 — Add-ons adicionales (paralelo/iterativo)

- Add-on **Outlook/Microsoft 365** (Graph API).
- Add-on **Yahoo** (IMAP + OAuth).
- Estructura lista para que se agreguen más add-ons a futuro (calendario, contactos compartidos, chat interno).

### Fase 5 — QA, seguridad y empaquetado final (2-3 semanas)

- Pruebas de instalación limpia en servidores nuevos (Ubuntu/Debian con Docker).
- Auditoría de seguridad: encriptación de contraseñas de cuentas de correo en DB, protección CSRF/XSS, rate limiting en login.
- Documentación de instalación para el cliente final (paso a paso con capturas).

### Fase 6 — Lanzamiento comercial

- Publicación del core (descarga gratuita, sitio propio o dev.xcodevs.com).
- Publicación de add-ons en la tienda dev.xcodevs.com con precios/planes.
- Landing de producto comparándolo con Roundcube (mensaje: "mismo propósito, interfaz moderna, extensible").

------

## 5. Estimado de tiempo total

**15 a 20 semanas** (aprox. 4-5 meses) con un equipo pequeño (1-2 desarrolladores full-stack + 1 diseñador part-time). Puede acortarse si se paraleliza el instalador (Fase 2) con el desarrollo del core (Fase 1), ya que no dependen 100% entre sí.

------

## 6. Modelo de negocio resumido

- **Core:** gratis, self-hosted, sin límite de usuarios (genera adopción, como Roundcube).
- **Add-ons:** de pago, licenciados vía dev.xcodevs.com — por conector (Gmail, Outlook, Yahoo) o en paquete "Conectores Pro".
- Posibilidad futura de plan **SaaS gestionado** (tú hosteas, cobras suscripción) como capa adicional de ingresos, sin afectar el modelo self-hosted gratuito del core.