import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service.js';

// Módulo hoja: solo el servicio, sin controller ni guards, para que
// AuthModule pueda leer la config del servidor de correo sin crear un
// import circular con SettingsModule (que sí depende de AuthModule).
@Module({
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsCoreModule {}
