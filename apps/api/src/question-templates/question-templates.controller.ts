import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AddTemplateQuestionDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/create-template.dto';
import { QuestionTemplatesService } from './question-templates.service';

@Controller()
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
export class QuestionTemplatesController {
  constructor(private readonly templates: QuestionTemplatesService) {}

  @Post('question-templates')
  create(@Body() dto: CreateTemplateDto) {
    return this.templates.create(dto);
  }

  @Get('question-templates')
  list() {
    return this.templates.list();
  }

  @Get('question-templates/:id')
  findOne(@Param('id') id: string) {
    return this.templates.findOne(id);
  }

  @Patch('question-templates/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Delete('question-templates/:id')
  remove(@Param('id') id: string) {
    return this.templates.remove(id);
  }

  @Post('question-templates/:id/questions')
  addQuestion(@Param('id') id: string, @Body() dto: AddTemplateQuestionDto) {
    return this.templates.addQuestion(id, dto);
  }

  @Delete('template-questions/:id')
  removeQuestion(@Param('id') id: string) {
    return this.templates.removeQuestion(id);
  }

  @Post('exams/:examId/questions/from-template/:templateId')
  apply(@Param('examId') examId: string, @Param('templateId') templateId: string) {
    return this.templates.applyToExam(templateId, examId);
  }
}
