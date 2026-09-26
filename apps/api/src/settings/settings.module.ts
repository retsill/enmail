import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SettingsCoreModule } from './settings-core.module.js';
import { SettingsController } from './settings.controller.js';

@Module({
  imports: [AuthModule, SettingsCoreModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
