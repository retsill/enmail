import { Body, Controller, Get, Post } from '@nestjs/common';
import { SetupService } from './setup.service.js';
import { CompleteSetupDto } from './dto/complete-setup.dto.js';

// Sin guard: hace falta poder consultarlo/completarlo ANTES de que exista
// ninguna cuenta para loguearse. SetupService ya rechaza completar de nuevo
// una vez que hay un admin.
@Controller('setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status')
  async status() {
    return { needsSetup: await this.setup.needsSetup() };
  }

  @Post()
  complete(@Body() dto: CompleteSetupDto) {
    return this.setup.complete(dto);
  }
}
