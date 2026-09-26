import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { OAuthController } from './oauth.controller.js';
import { IntegrationsCoreModule } from './integrations-core.module.js';
import { MailAccountsCoreModule } from '../mail-accounts/mail-accounts-core.module.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
    IntegrationsCoreModule,
    MailAccountsCoreModule,
  ],
  controllers: [OAuthController],
})
export class OAuthModule {}
