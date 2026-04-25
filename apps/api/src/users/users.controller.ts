import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  changeOwn(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.users.changeOwnPassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetByAdmin(@Param('id') id: string) {
    return this.users.resetPasswordByAdmin(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.users.setActive(id, false);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.users.setActive(id, true);
  }
}
