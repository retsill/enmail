import { createHash } from 'node:crypto';
import type { MailboxPasswordConfig, MailboxPasswordProvider } from './mailbox-password-provider.interface.js';
import { httpRequest } from './http-client.js';

function md5(value: string): string {
  return createHash('md5').update(value).digest('hex');
}

// API abierta de aaPanel (Panel Settings > API interface), NO el login de la
// consola web (ese pide captcha y tiene un límite de intentos que no
// queremos arriesgar a disparar). baseUrl esperado "https://host:puerto"
// (el puerto propio del panel, no el 443 del sitio). username no se usa acá
// (aaPanel no tiene "usuario" para esta API, solo un token) pero se deja en
// la interfaz común por consistencia con cPanel/Plesk.
// secret = el token plano que muestra el panel al activar el API interface.
//
// Importante: esto llama directo a la función interna del plugin de correo
// instalado (mail_sys.update_mailbox_v2), reconstruida a partir del código
// fuente real del plugin — no es una API pública documentada por aaPanel, así
// que puede necesitar ajustes si una actualización del plugin cambia sus
// parámetros. "Probar conexión" antes de confiar en esto para usuarios reales.
export class AaPanelMailboxPasswordProvider implements MailboxPasswordProvider {
  constructor(private readonly config: MailboxPasswordConfig) {}

  private authParams(): Record<string, string> {
    const requestTime = String(Math.floor(Date.now() / 1000));
    const requestToken = md5(requestTime + md5(this.config.secret));
    return { request_time: requestTime, request_token: requestToken };
  }

  private async call(pluginFn: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const body = new URLSearchParams({
      action: 'a',
      name: 'mail_sys',
      s: pluginFn,
      ...this.authParams(),
      ...params,
    }).toString();
    const res = await httpRequest(`${this.config.baseUrl}/plugin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      allowInsecureTls: this.config.allowInsecureTls,
    });
    let data: { status?: boolean; msg?: string } & Record<string, unknown>;
    try {
      data = JSON.parse(res.body);
    } catch {
      throw new Error(`Respuesta inesperada de aaPanel (HTTP ${res.status})`);
    }
    if (data.status === false) {
      throw new Error(String(data.msg ?? 'aaPanel devolvió un error sin detalle'));
    }
    return data;
  }

  private async findMailbox(email: string): Promise<{
    full_name: string;
    quota: number;
    active: string;
    is_admin: string;
    quota_active?: string;
  }> {
    const domain = email.split('@')[1];
    const result = await this.call('get_mailboxs', { domain, search: email, p: '1', size: '1' });
    const rows = (result as { data?: Array<Record<string, unknown>> }).data ?? [];
    const row = rows.find((r) => r.username === email);
    if (!row) throw new Error(`No se encontró el buzón ${email} en aaPanel`);
    return row as unknown as {
      full_name: string;
      quota: number;
      active: string;
      is_admin: string;
      quota_active?: string;
    };
  }

  async testConnection(): Promise<void> {
    await this.call('get_mailboxs', { p: '1', size: '1' });
  }

  async changePassword(email: string, newPassword: string): Promise<void> {
    const mailbox = await this.findMailbox(email);
    // quota vuelve en bytes; update_mailbox_v2 espera texto "N MB"/"N GB" —
    // se manda siempre en MB para no perder precisión en la conversión.
    const quotaMb = mailbox.quota / (1024 * 1024);
    await this.call('update_mailbox_v2', {
      username: email,
      password: newPassword,
      full_name: mailbox.full_name ?? '',
      quota: `${quotaMb} MB`,
      active: String(mailbox.active ?? 1),
      is_admin: String(mailbox.is_admin ?? 0),
      quota_active: String(mailbox.quota_active ?? 1),
    });
  }
}
