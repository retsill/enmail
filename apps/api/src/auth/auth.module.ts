import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './jwt.strategy.js';
import { CryptoService } from '../common/crypto/crypto.service.js';
import { SettingsCoreModule } from '../settings/settings-core.module.js';
import { MailAccountsCoreModule } from '../mail-accounts/mail-accounts-core.module.js';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: Number(config.get<string>('JWT_EXPIRES_IN') ?? 86400) },
      }),
    }),
    SettingsCoreModule,
    MailAccountsCoreModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, CryptoService],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
