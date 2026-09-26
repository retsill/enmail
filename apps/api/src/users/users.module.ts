import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { MeController } from './me.controller.js';
import { ProfileController } from './profile.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [UsersController, MeController, ProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
