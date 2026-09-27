import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SettingsCoreModule } from './settings-core.module.js';
import { SettingsController } from './settings.controller.js';
import { MailboxPasswordModule } from '../mailbox-password/mailbox-password.module.js';

@Module({
  imports: [AuthModule, SettingsCoreModule, MailboxPasswordModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
