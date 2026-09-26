import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MailAccountsModule } from '../mail-accounts/mail-accounts.module.js';
import { IntegrationsCoreModule } from '../integrations/integrations-core.module.js';
import { ContactsModule } from '../contacts/contacts.module.js';
import { MailController } from './mail.controller.js';
import { UnifiedInboxController } from './unified-inbox.controller.js';
import { MailSyncService } from './mail-sync.service.js';

@Module({
  imports: [AuthModule, MailAccountsModule, IntegrationsCoreModule, ContactsModule],
  controllers: [MailController, UnifiedInboxController],
  providers: [MailSyncService],
})
export class MailModule {}
