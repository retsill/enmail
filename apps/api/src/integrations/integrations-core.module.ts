import { Module } from '@nestjs/common';
import { OAuthTokenService } from './oauth-token.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';

// Módulo hoja: sin controller ni guards, para poder inyectar OAuthTokenService
// tanto en MailModule (refresh de tokens al sincronizar) como en OAuthModule
// (intercambio inicial del code) sin ciclos de imports.
@Module({
  providers: [OAuthTokenService, CryptoService],
  exports: [OAuthTokenService, CryptoService],
})
export class IntegrationsCoreModule {}
