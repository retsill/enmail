import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MailAccountsCoreModule } from './mail-accounts-core.module.js';
import { MailAccountsController } from './mail-accounts.controller.js';

@Module({
  imports: [AuthModule, MailAccountsCoreModule],
  controllers: [MailAccountsController],
  exports: [MailAccountsCoreModule],
})
export class MailAccountsModule {}
