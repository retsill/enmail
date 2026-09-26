import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Cifra en reposo las credenciales de las cuentas de correo (password IMAP,
// refresh tokens de add-ons OAuth) con AES-256-GCM. La clave viene de
// MAIL_ENCRYPTION_KEY (.env); en producción debe generarse por el instalador.
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const secret = config.getOrThrow<string>('MAIL_ENCRYPTION_KEY');
    this.key = scryptSync(secret, 'webmail-propio-salt', 32);
  }

  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, 12);
    const authTag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
