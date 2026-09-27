import type { MailboxPasswordConfig, MailboxPasswordProvider } from './mailbox-password-provider.interface.js';
import { httpRequest } from './http-client.js';

// UAPI de cPanel (no WHM): https://{host}:2083/execute/Email/passwd_pop.
// baseUrl esperado tal cual "https://host:2083" (sin barra final).
// username = usuario de la cuenta cPanel (no el email); secret = API token
// generado en cPanel > Security > Manage API Tokens.
export class CPanelMailboxPasswordProvider implements MailboxPasswordProvider {
  constructor(private readonly config: MailboxPasswordConfig) {}

  private authHeader(): string {
    return `cpanel ${this.config.username}:${this.config.secret}`;
  }

  private async call(path: string, params: Record<string, string>) {
    const query = new URLSearchParams(params).toString();
    const res = await httpRequest(`${this.config.baseUrl}${path}?${query}`, {
      method: 'GET',
      headers: { Authorization: this.authHeader() },
      allowInsecureTls: this.config.allowInsecureTls,
    });
    if (res.status === 401 || res.status === 403) {
      throw new Error('cPanel rechazó las credenciales (usuario o API token inválidos)');
    }
    let data: { status?: number; errors?: string[] } & Record<string, unknown>;
    try {
      data = JSON.parse(res.body);
    } catch {
      throw new Error(`Respuesta inesperada de cPanel (HTTP ${res.status})`);
    }
    if (!data.status) {
      throw new Error(data.errors?.join(', ') ?? 'cPanel devolvió un error sin detalle');
    }
    return data;
  }

  async testConnection(): Promise<void> {
    await this.call('/execute/Email/list_pops', {});
  }

  async changePassword(email: string, newPassword: string): Promise<void> {
    const domain = email.split('@')[1];
    if (!domain) throw new Error('Email inválido');
    await this.call('/execute/Email/passwd_pop', { email, password: newPassword, domain });
  }
}
