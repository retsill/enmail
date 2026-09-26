import { Module } from '@nestjs/common';
import { MailAccountsService } from './mail-accounts.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';

// Módulo hoja: solo el servicio, para que AuthModule pueda provisionar la
// cuenta principal en el login directo sin importar el módulo completo
// (que depende de AuthModule para sus guards) y crear un ciclo.
@Module({
  providers: [MailAccountsService, CryptoService],
  exports: [MailAccountsService],
})
export class MailAccountsCoreModule {}
