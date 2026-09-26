import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { UserRole } from '../generated/prisma/enums.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id/role')
  setRole(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.setRole(user.sub, id, dto.role);
  }
}
