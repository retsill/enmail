import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';
import { getOAuthProvider } from './oauth-providers.js';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

@Injectable()
export class OAuthTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async getEnabledAddon(slug: string) {
    const addon = await this.prisma.addon.findUnique({ where: { slug } });
    if (!addon || !addon.enabled || !addon.clientId || !addon.encryptedClientSecret) {
      throw new NotFoundException(`La integración "${slug}" no está configurada o habilitada`);
    }
    return addon;
  }

  private async tokenRequest(slug: string, body: Record<string, string>): Promise<TokenResponse> {
    const provider = getOAuthProvider(slug);
    if (!provider) throw new NotFoundException(`Proveedor OAuth desconocido: ${slug}`);

    const res = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    const json = (await res.json()) as TokenResponse;
    if (!res.ok || json.error) {
      throw new BadRequestException(json.error_description || json.error || 'Error obteniendo el token');
    }
    return json;
  }

  async exchangeCodeForTokens(slug: string, code: string, redirectUri: string) {
    const addon = await this.getEnabledAddon(slug);
    const clientSecret = this.crypto.decrypt(addon.encryptedClientSecret!);

    return this.tokenRequest(slug, {
      code,
      client_id: addon.clientId!,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
  }

  async refreshAccessToken(slug: string, refreshToken: string) {
    const addon = await this.getEnabledAddon(slug);
    const clientSecret = this.crypto.decrypt(addon.encryptedClientSecret!);

    return this.tokenRequest(slug, {
      refresh_token: refreshToken,
      client_id: addon.clientId!,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });
  }

  async fetchUserEmail(slug: string, accessToken: string): Promise<string> {
    const provider = getOAuthProvider(slug);
    if (!provider) throw new NotFoundException(`Proveedor OAuth desconocido: ${slug}`);

    const res = await fetch(provider.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new BadRequestException('No se pudo obtener el correo de la cuenta');

    const info = (await res.json()) as { email?: string; preferred_username?: string; mail?: string };
    const email = info.email || info.preferred_username || info.mail;
    if (!email) throw new BadRequestException('El proveedor no devolvió un correo válido');
    return email;
  }
}
