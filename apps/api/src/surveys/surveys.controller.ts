import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { SurveysService } from './surveys.service';

@Controller()
export class SurveysController {
  constructor(private readonly surveys: SurveysService) {}

  @Roles(Role.STUDENT)
  @Post('surveys')
  submit(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSurveyDto) {
    return this.surveys.submit(user, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER, Role.CLIENT)
  @Get('courses/:courseId/surveys')
  list(@Param('courseId') courseId: string) {
    return this.surveys.listByCourse(courseId);
  }

  @Get('courses/:courseId/surveys/summary')
  summary(@Param('courseId') courseId: string) {
    return this.surveys.summaryByCourse(courseId);
  }
}
