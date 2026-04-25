import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CoordinatorsService } from './coordinators.service';
import { CreateCoordinatorDto } from './dto/create-coordinator.dto';
import { UpdateCoordinatorDto } from './dto/update-coordinator.dto';

@Controller('coordinators')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
export class CoordinatorsController {
  constructor(private readonly coordinators: CoordinatorsService) {}

  @Post()
  create(@Body() dto: CreateCoordinatorDto) {
    return this.coordinators.create(dto);
  }

  @Get()
  list() {
    return this.coordinators.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coordinators.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCoordinatorDto) {
    return this.coordinators.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coordinators.remove(id);
  }
}
