import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ListCoursesQuery } from './dto/list-courses.query';
import { UpdateCourseDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() q: ListCoursesQuery) {
    return this.courses.list(user, q.closed);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.courses.findOne(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(@Param('id') id: string) {
    return this.courses.setClosed(id, true);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  reopen(@Param('id') id: string) {
    return this.courses.setClosed(id, false);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.courses.remove(id);
  }
}
