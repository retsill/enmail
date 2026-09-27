import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import { CryptoService } from '../common/crypto/crypto.service.js';

// Módulo hoja: solo el servicio, sin controller ni guards, para que
// AuthModule pueda leer la config del servidor de correo sin crear un
// import circular con SettingsModule (que sí depende de AuthModule).
@Module({
  providers: [SettingsService, CryptoService],
  exports: [SettingsService],
})
export class SettingsCoreModule {}
