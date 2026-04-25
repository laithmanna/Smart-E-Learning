import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async enroll(courseId: string, studentId: string) {
    const [course, student] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId } }),
      this.prisma.student.findUnique({ where: { id: studentId } }),
    ]);
    if (!course) throw new NotFoundException('Course not found');
    if (!student) throw new NotFoundException('Student not found');

    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    if (existing) throw new ConflictException('Already enrolled');

    return this.prisma.enrollment.create({ data: { courseId, studentId } });
  }

  async unenroll(courseId: string, studentId: string) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    if (!existing) throw new NotFoundException('Enrollment not found');
    await this.prisma.enrollment.delete({
      where: { courseId_studentId: { courseId, studentId } },
    });
    return { courseId, studentId };
  }

  listByCourse(courseId: string) {
    return this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          include: { user: { select: { id: true, email: true, isActive: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
