import { Module } from '@nestjs/common';
import { SetupController } from './setup.controller.js';
import { SetupService } from './setup.service.js';
import { SettingsCoreModule } from '../settings/settings-core.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [SettingsCoreModule, AuthModule],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
