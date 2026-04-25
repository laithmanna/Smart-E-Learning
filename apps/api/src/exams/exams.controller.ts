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
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { GradeExamDto } from './dto/grade-exam.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ExamsService } from './exams.service';
import { QuestionsService } from './questions.service';
import { SubmissionsService } from './submissions.service';

@Controller()
export class ExamsController {
  constructor(
    private readonly exams: ExamsService,
    private readonly questions: QuestionsService,
    private readonly submissions: SubmissionsService,
  ) {}

  // ----- Exams -----

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('exams')
  create(@Body() dto: CreateExamDto) {
    return this.exams.create(dto);
  }

  @Get('exams')
  list(@Query('courseId') courseId: string) {
    return this.exams.listByCourse(courseId);
  }

  @Get('exams/:id')
  findOne(@Param('id') id: string) {
    return this.exams.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Patch('exams/:id')
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.exams.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Delete('exams/:id')
  remove(@Param('id') id: string) {
    return this.exams.remove(id);
  }

  // ----- Questions -----

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('exams/:examId/questions')
  addQuestion(@Param('examId') examId: string, @Body() dto: CreateQuestionDto) {
    return this.questions.create(examId, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Patch('questions/:id')
  updateQuestion(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questions.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Delete('questions/:id')
  removeQuestion(@Param('id') id: string) {
    return this.questions.remove(id);
  }

  // ----- Student take + submit -----

  @Get('exams/:id/take')
  take(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.submissions.getForStudent(id, user);
  }

  @Roles(Role.STUDENT)
  @Post('exams/:id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitAnswersDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.submissions.submit(id, user, dto.answers);
  }

  // ----- Trainer grading + reviewing -----

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Get('exams/:id/submissions')
  listSubmissions(@Param('id') id: string) {
    return this.submissions.listSubmissions(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Get('exams/:id/submissions/:studentId')
  getSubmission(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.submissions.getStudentSubmission(id, studentId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('exams/:id/submissions/:studentId/grade')
  grade(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
    @Body() dto: GradeExamDto,
  ) {
    return this.submissions.grade(id, studentId, dto.marksObtained);
  }

  // ----- Results -----

  @Get('exams/:id/results')
  results(@Param('id') id: string) {
    return this.submissions.listResults(id);
  }

  @Roles(Role.STUDENT)
  @Get('me/exam-results')
  myResults(@CurrentUser() user: AuthenticatedUser) {
    return this.submissions.myResults(user);
  }
}
