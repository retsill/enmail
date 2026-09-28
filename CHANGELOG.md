# Changelog

Todas las versiones notables de enMail se documentan acá.

## [1.0.0] — 2026-09-28

Primer release estable.

### Agregado
- Bandeja estilo Gmail: bandeja unificada, destacados, carpetas por cuenta, categorías (Principal/Social/Promociones/Actualizaciones/Foros), búsqueda, arrastrar y soltar entre carpetas.
- Múltiples cuentas IMAP/SMTP por usuario, más conectores OAuth para Gmail y Outlook.
- Redactar con ventanas emergentes apilables (estilo Gmail) o a pantalla completa, firma por cuenta, adjuntos.
- Lector de mensajes con barra de acciones fija al hacer scroll, badge de carpeta, panel de detalles (de/para/cc/fecha), imprimir y abrir en ventana nueva.
- Adjuntos: se listan y se pueden descargar uno por uno o todos juntos en un .zip.
- Borradores: se abren en modo edición (no como lectura), sin duplicarse al volver a guardarlos.
- Asistente de instalación de primer uso (crea el admin y configura el servidor de correo, sin credenciales fijas de fábrica).
- Cambio de contraseña real de un buzón desde la propia cuenta, conectando con la API de cPanel, Plesk o aaPanel.
- Interfaz completa en español e inglés, tema claro/oscuro, fondos personalizados.
- Versión mobile con diseño de una sola columna (lista o lectura), sidebar de pantalla completa con animación, y menú de apps (Correo/Contactos) dentro del mismo drawer.
- Gestión de usuarios y roles, páginas de contenido dinámicas (Términos, Privacidad, etc.), branding personalizable (logo claro/oscuro, favicon).
- Documentación bilingüe con guías de instalación (Docker, manual, aaPanel, cPanel, Plesk, Hostinger/VPS) y galería de capturas.

### Corregido
- El HTML de un correo citado al responder/reenviar se insertaba sin sanitizar en el editor — un `<style>` del correo original podía romper el layout de toda la app, y un `onerror`/`onload` en una imagen citada podía ejecutar JS ajeno en la sesión del usuario. Ahora se sanitiza siempre, y Reenviar manda el contenido original sin mostrarlo en el editor.
