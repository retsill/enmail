import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';

// Cliente HTTP mínimo a mano (en vez de fetch) porque necesitamos control
// directo sobre rejectUnauthorized por request — los paneles de hosting
// compartido suelen tener el mismo problema de certificado mal emparejado
// que ya vimos con el servidor de correo (ver allowInsecureTls ahí).
export async function httpRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    allowInsecureTls?: boolean;
  } = {},
): Promise<{ status: number; body: string }> {
  const parsed = new URL(url);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: options.method ?? 'GET',
        headers: options.headers,
        rejectUnauthorized: !options.allowInsecureTls,
        timeout: 15000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado')));
    if (options.body) req.write(options.body);
    req.end();
  });
}
