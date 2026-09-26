import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { MailAccountsService } from '../mail-accounts/mail-accounts.service.js';
import { OAuthTokenService } from './oauth-token.service.js';
import { getOAuthProvider } from './oauth-providers.js';

// Flujo OAuth (Gmail/Outlook). No usa JwtAuthGuard porque el navegador navega
// directo a estas URLs (no puede mandar el header Authorization): el usuario
// se identifica con `token` como query param en /start, empacado en un
// `state` firmado que /callback vuelve a verificar.
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailAccounts: MailAccountsService,
    private readonly oauthTokens: OAuthTokenService,
  ) {}

  @Get(':slug/start')
  async start(@Param('slug') slug: string, @Query('token') token: string, @Res() res: Response) {
    if (!token) throw new BadRequestException('Falta el token de sesión');
    const payload = await this.jwt.verifyAsync<{ sub: string }>(token).catch(() => {
      throw new BadRequestException('Sesión inválida o expirada');
    });

    const provider = getOAuthProvider(slug);
    if (!provider) throw new NotFoundException('Proveedor no soportado');

    const addon = await this.oauthTokens.getEnabledAddon(slug);
    const state = await this.jwt.signAsync({ userId: payload.sub, slug }, { expiresIn: '10m' });

    const url = new URL(provider.authUrl);
    url.searchParams.set('client_id', addon.clientId!);
    url.searchParams.set('redirect_uri', addon.redirectUri!);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', provider.scope);
    url.searchParams.set('state', state);
    for (const [key, value] of Object.entries(provider.extraAuthParams ?? {})) {
      url.searchParams.set(key, value);
    }

    res.redirect(url.toString());
  }

  @Get(':slug/callback')
  async callback(
    @Param('slug') slug: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';

    if (error || !code || !state) {
      return res.redirect(`${frontendUrl}/inbox?oauthError=${encodeURIComponent(error || 'cancelled')}`);
    }

    try {
      const { userId } = await this.jwt.verifyAsync<{ userId: string; slug: string }>(state);
      const addon = await this.oauthTokens.getEnabledAddon(slug);

      const tokens = await this.oauthTokens.exchangeCodeForTokens(slug, code, addon.redirectUri!);
      if (!tokens.refresh_token) {
        throw new BadRequestException(
          'El proveedor no devolvió un refresh token (intenta revocar el acceso previo y reconectar)',
        );
      }

      const email = await this.oauthTokens.fetchUserEmail(slug, tokens.access_token);

      await this.mailAccounts.upsertOAuthAccount(
        userId,
        slug.toUpperCase() as 'GMAIL' | 'OUTLOOK',
        email,
        tokens.refresh_token,
      );

      res.redirect(`${frontendUrl}/inbox?connected=${slug}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'error desconocido';
      res.redirect(`${frontendUrl}/inbox?oauthError=${encodeURIComponent(message)}`);
    }
  }
}
