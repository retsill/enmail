import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { MailAccountsModule } from './mail-accounts/mail-accounts.module.js';
import { MailModule } from './mail/mail.module.js';
import { AddonsModule } from './addons/addons.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { OAuthModule } from './integrations/oauth.module.js';
import { ContactsModule } from './contacts/contacts.module.js';
import { SetupModule } from './setup/setup.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    MailAccountsModule,
    MailModule,
    AddonsModule,
    SettingsModule,
    OAuthModule,
    ContactsModule,
    SetupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
