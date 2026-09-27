import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { MeController } from './me.controller.js';
import { ProfileController } from './profile.controller.js';
import { SettingsCoreModule } from '../settings/settings-core.module.js';
import { MailAccountsCoreModule } from '../mail-accounts/mail-accounts-core.module.js';
import { MailboxPasswordModule } from '../mailbox-password/mailbox-password.module.js';

@Module({
  imports: [AuthModule, SettingsCoreModule, MailAccountsCoreModule, MailboxPasswordModule],
  controllers: [UsersController, MeController, ProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
