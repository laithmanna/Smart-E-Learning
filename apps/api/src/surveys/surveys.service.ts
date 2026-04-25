import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSurveyDto } from './dto/create-survey.dto';

@Injectable()
export class SurveysService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(user: AuthenticatedUser, dto: CreateSurveyDto) {
    if (user.role !== Role.STUDENT) throw new ForbiddenException('Only students can submit surveys');
    const student = await this.prisma.student.findUnique({ where: { userId: user.sub } });
    if (!student) throw new ForbiddenException('No student profile');

    const enrolled = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId: dto.courseId, studentId: student.id } },
    });
    if (!enrolled) throw new ForbiddenException('Not enrolled in this course');

    const existing = await this.prisma.survey.findUnique({
      where: { courseId_studentId: { courseId: dto.courseId, studentId: student.id } },
    });
    if (existing) throw new ConflictException('Survey already submitted');

    return this.prisma.survey.create({
      data: {
        courseId: dto.courseId,
        studentId: student.id,
        rating: dto.rating,
        feedback: dto.feedback,
      },
    });
  }

  async listByCourse(courseId: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.survey.findMany({
      where: { courseId },
      include: {
        student: { select: { id: true, name: true, user: { select: { email: true } } } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async summaryByCourse(courseId: string) {
    const surveys = await this.prisma.survey.findMany({ where: { courseId } });
    if (surveys.length === 0) return { count: 0, averageRating: null };
    const sum = surveys.reduce((acc, s) => acc + s.rating, 0);
    return {
      count: surveys.length,
      averageRating: Math.round((sum / surveys.length) * 100) / 100,
    };
  }
}
