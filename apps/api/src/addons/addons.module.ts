import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AddonsController } from './addons.controller.js';
import { CryptoService } from '../common/crypto/crypto.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AddonsController],
  providers: [CryptoService],
})
export class AddonsModule {}
