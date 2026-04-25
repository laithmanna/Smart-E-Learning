import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import { UpdateClassDto } from './dto/update-class.dto';

@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  list(@Query('courseId') courseId: string) {
    return this.classes.listByCourse(courseId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classes.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classes.update(id, dto);
  }
}
