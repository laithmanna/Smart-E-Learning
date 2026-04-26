import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddEvaluationQuestionDto,
  CreateEvaluationDto,
  UpdateEvaluationDto,
} from './dto/create-evaluation.dto';
import { EvaluationResponseEntry } from './dto/submit-evaluation.dto';

@Injectable()
export class EvaluationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEvaluationDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.evaluation.create({
      data: { courseId: dto.courseId, name: dto.name },
      include: { _count: { select: { questions: true } } },
    });
  }

  async createFromTemplate(templateId: string, courseId: string, name: string) {
    const [template, course] = await Promise.all([
      this.prisma.questionTemplate.findUnique({
        where: { id: templateId },
        include: { questions: true },
      }),
      this.prisma.course.findUnique({ where: { id: courseId } }),
    ]);
    if (!template) throw new NotFoundException('Template not found');
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.evaluation.create({
      data: {
        courseId,
        name,
        questions: {
          create: template.questions.map((q) => ({ question: q.text })),
        },
      },
      include: { _count: { select: { questions: true } } },
    });
  }

  listByCourse(courseId: string, user: AuthenticatedUser) {
    return this.prisma.evaluation.findMany({
      where: {
        courseId,
        ...(user.role === Role.STUDENT ? { isPublished: true } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { questions: true } } },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const e = await this.prisma.evaluation.findUnique({
      where: { id },
      include: { questions: { orderBy: { id: 'asc' } } },
    });
    if (!e) throw new NotFoundException('Evaluation not found');
    if (user.role === Role.STUDENT && !e.isPublished) {
      throw new ForbiddenException('Evaluation not published');
    }
    return e;
  }

  async update(id: string, dto: UpdateEvaluationDto) {
    await this.ensureExists(id);
    return this.prisma.evaluation.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.evaluation.delete({ where: { id } });
    return { id };
  }

  async addQuestion(evaluationId: string, dto: AddEvaluationQuestionDto) {
    await this.ensureExists(evaluationId);
    return this.prisma.evaluationQuestion.create({
      data: { evaluationId, question: dto.question },
    });
  }

  async removeQuestion(id: string) {
    const q = await this.prisma.evaluationQuestion.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    await this.prisma.evaluationQuestion.delete({ where: { id } });
    return { id };
  }

  async submit(
    evaluationId: string,
    user: AuthenticatedUser,
    responses: EvaluationResponseEntry[],
  ) {
    if (user.role !== Role.STUDENT) {
      throw new ForbiddenException('Only students can submit evaluations');
    }
    const student = await this.prisma.student.findUnique({ where: { userId: user.sub } });
    if (!student) throw new ForbiddenException('No student profile');

    const evalRec = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { questions: true },
    });
    if (!evalRec) throw new NotFoundException('Evaluation not found');
    if (!evalRec.isPublished) throw new ForbiddenException('Evaluation not published');

    const enrolled = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: evalRec.courseId, studentId: student.id } },
    });
    if (!enrolled) throw new ForbiddenException('Not enrolled in the course for this evaluation');

    const validIds = new Set(evalRec.questions.map((q) => q.id));
    for (const r of responses) {
      if (!validIds.has(r.questionId)) {
        throw new BadRequestException(`Question ${r.questionId} does not belong to this evaluation`);
      }
    }

    await this.prisma.$transaction(
      responses.map((r) =>
        this.prisma.evaluationResponse.upsert({
          where: {
            evaluationQuestionId_studentId: {
              evaluationQuestionId: r.questionId,
              studentId: student.id,
            },
          },
          update: { rating: r.rating },
          create: {
            evaluationQuestionId: r.questionId,
            studentId: student.id,
            rating: r.rating,
          },
        }),
      ),
    );
    return { count: responses.length };
  }

  async report(evaluationId: string) {
    const evalRec = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        questions: {
          include: { responses: { include: { student: { select: { id: true, name: true } } } } },
        },
      },
    });
    if (!evalRec) throw new NotFoundException('Evaluation not found');

    return {
      id: evalRec.id,
      name: evalRec.name,
      isPublished: evalRec.isPublished,
      questions: evalRec.questions.map((q) => ({
        id: q.id,
        question: q.question,
        responses: q.responses.map((r) => ({
          studentId: r.studentId,
          studentName: r.student.name,
          rating: r.rating,
        })),
      })),
    };
  }

  private async ensureExists(id: string) {
    const e = await this.prisma.evaluation.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Evaluation not found');
    return e;
  }
}
