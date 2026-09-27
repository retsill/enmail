import { XMLParser } from 'fast-xml-parser';
import type { MailboxPasswordConfig, MailboxPasswordProvider } from './mailbox-password-provider.interface.js';
import { httpRequest } from './http-client.js';

const parser = new XMLParser();

// XML API de Plesk: https://{host}:8443/enterprise/control/agent.php.
// baseUrl esperado tal cual "https://host:8443" (sin barra final).
// username/secret = usuario y password de un admin de Plesk (el único rol
// habilitado para esta API sin restricciones por cliente/dominio).
export class PleskMailboxPasswordProvider implements MailboxPasswordProvider {
  constructor(private readonly config: MailboxPasswordConfig) {}

  private escapeXml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private async send(packetXml: string): Promise<Record<string, unknown>> {
    const res = await httpRequest(`${this.config.baseUrl}/enterprise/control/agent.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        HTTP_AUTH_LOGIN: this.config.username,
        HTTP_AUTH_PASSWD: this.config.secret,
      },
      body: `<?xml version="1.0" encoding="UTF-8"?><packet>${packetXml}</packet>`,
      allowInsecureTls: this.config.allowInsecureTls,
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error('Plesk rechazó las credenciales (usuario/password de admin inválidos)');
    }
    if (res.status >= 500) {
      throw new Error(`Plesk devolvió un error de servidor (HTTP ${res.status})`);
    }
    return parser.parse(res.body);
  }

  // El filtro para cambiar el password de un buzón necesita el site-id del
  // dominio (no alcanza con el nombre) — se resuelve en un paso aparte.
  private async findSiteId(domain: string): Promise<string> {
    const parsed = await this.send(
      `<site><get><filter><name>${this.escapeXml(domain)}</name></filter><dataset><gen_info/></dataset></get></site>`,
    );
    const result = (parsed as any)?.packet?.site?.get?.result;
    if (!result || result.status !== 'ok') {
      throw new Error(`Plesk: no se encontró el sitio para el dominio "${domain}"`);
    }
    return String(result.id);
  }

  async testConnection(): Promise<void> {
    const parsed = await this.send('<server><get><gen_info/></get></server>');
    const packet = (parsed as any)?.packet;
    if (!packet) throw new Error('Respuesta inesperada de Plesk');
  }

  async changePassword(email: string, newPassword: string): Promise<void> {
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) throw new Error('Email inválido');

    const siteId = await this.findSiteId(domain);
    // "add" (no "set"): "set" reemplaza TODA la configuración del buzón
    // (antivirus, antispam, alias, etc.), "add" solo agrega/pisa lo que se
    // manda acá y deja el resto sin tocar — clave para no desactivar nada
    // al cambiar únicamente el password.
    const parsed = await this.send(
      `<mail><update><add><filter><site-id>${siteId}</site-id><mailname><name>${this.escapeXml(
        localPart,
      )}</name></mailname></filter><mailname><password><value>${this.escapeXml(
        newPassword,
      )}</value><type>plain</type></password></mailname></add></update></mail>`,
    );
    const result = (parsed as any)?.packet?.mail?.update?.add?.result;
    if (!result || result.status !== 'ok') {
      const errText = result?.errtext ?? 'Plesk rechazó el cambio de password';
      throw new Error(String(errText));
    }
  }
}
