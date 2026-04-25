import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddTemplateQuestionDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from './dto/create-template.dto';

@Injectable()
export class QuestionTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTemplateDto) {
    return this.prisma.questionTemplate.create({ data: dto });
  }

  list() {
    return this.prisma.questionTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true } } },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.questionTemplate.findUnique({
      where: { id },
      include: { questions: true },
    });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.ensureExists(id);
    return this.prisma.questionTemplate.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.questionTemplate.delete({ where: { id } });
    return { id };
  }

  async addQuestion(templateId: string, dto: AddTemplateQuestionDto) {
    await this.ensureExists(templateId);
    return this.prisma.templateQuestion.create({
      data: { templateId, text: dto.text, type: dto.type },
    });
  }

  async removeQuestion(id: string) {
    const q = await this.prisma.templateQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Template question not found');
    await this.prisma.templateQuestion.delete({ where: { id } });
    return { id };
  }

  /**
   * Copy all questions from a template into an exam.
   * MCQ template questions get type=text-only (no options/correctOption are stored
   * on the template), so they're imported as free-text by default — admins can
   * edit each one to add options + correctOption.
   */
  async applyToExam(templateId: string, examId: string) {
    const [template, exam] = await Promise.all([
      this.prisma.questionTemplate.findUnique({
        where: { id: templateId },
        include: { questions: true },
      }),
      this.prisma.exam.findUnique({ where: { id: examId } }),
    ]);
    if (!template) throw new NotFoundException('Template not found');
    if (!exam) throw new NotFoundException('Exam not found');

    const created = await this.prisma.$transaction(
      template.questions.map((q) =>
        this.prisma.question.create({
          data: { examId, questionText: q.text },
        }),
      ),
    );
    return { count: created.length };
  }

  private async ensureExists(id: string) {
    const t = await this.prisma.questionTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }
}
