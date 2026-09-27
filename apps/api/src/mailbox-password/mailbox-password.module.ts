import { Module } from '@nestjs/common';
import { MailboxPasswordService } from './mailbox-password.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';

// Módulo hoja (como SettingsCoreModule/MailAccountsCoreModule): solo el
// servicio, para poder importarlo tanto desde SettingsModule (config del
// admin) como desde UsersModule (cambio de password real de un usuario) sin
// ciclos.
@Module({
  providers: [MailboxPasswordService, CryptoService],
  exports: [MailboxPasswordService],
})
export class MailboxPasswordModule {}
