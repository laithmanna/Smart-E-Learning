import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admins')
@Roles(Role.SUPER_ADMIN)
export class AdminsController {
  constructor(private readonly admins: AdminsService) {}

  @Post()
  create(@Body() dto: CreateAdminDto) {
    return this.admins.create(dto);
  }

  @Get()
  list() {
    return this.admins.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.admins.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.admins.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.admins.remove(id);
  }
}
