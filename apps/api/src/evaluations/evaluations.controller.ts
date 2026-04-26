import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  AddEvaluationQuestionDto,
  CreateEvaluationDto,
  UpdateEvaluationDto,
} from './dto/create-evaluation.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { EvaluationsService } from './evaluations.service';

@Controller()
export class EvaluationsController {
  constructor(private readonly evaluations: EvaluationsService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post('evaluations')
  create(@Body() dto: CreateEvaluationDto) {
    return this.evaluations.create(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post('evaluations/from-template/:templateId')
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body() body: { courseId: string; name: string },
  ) {
    return this.evaluations.createFromTemplate(templateId, body.courseId, body.name);
  }

  @Get('evaluations')
  list(@Query('courseId') courseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.evaluations.listByCourse(courseId, user);
  }

  @Get('evaluations/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.evaluations.findOne(id, user);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Patch('evaluations/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEvaluationDto) {
    return this.evaluations.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Delete('evaluations/:id')
  remove(@Param('id') id: string) {
    return this.evaluations.remove(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post('evaluations/:id/questions')
  addQuestion(@Param('id') id: string, @Body() dto: AddEvaluationQuestionDto) {
    return this.evaluations.addQuestion(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Delete('evaluation-questions/:id')
  removeQuestion(@Param('id') id: string) {
    return this.evaluations.removeQuestion(id);
  }

  @Roles(Role.STUDENT)
  @Get('me/evaluation-responses')
  myResponses(
    @Query('evaluationId') evaluationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evaluations.myResponses(evaluationId, user);
  }

  @Roles(Role.STUDENT)
  @Post('evaluations/:id/responses')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitEvaluationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.evaluations.submit(id, user, dto.responses);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER, Role.CLIENT)
  @Get('evaluations/:id/report')
  report(@Param('id') id: string) {
    return this.evaluations.report(id);
  }
}
