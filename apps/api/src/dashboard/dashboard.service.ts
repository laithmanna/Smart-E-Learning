import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(user: AuthenticatedUser) {
    switch (user.role) {
      case Role.SUPER_ADMIN:
      case Role.ADMIN:
        return this.adminStats();
      case Role.COORDINATOR:
        return this.adminStats();
      case Role.TRAINER:
        return this.trainerStats(user.sub);
      case Role.STUDENT:
        return this.studentStats(user.sub);
      case Role.CLIENT:
        return this.clientStats(user.sub);
      default:
        throw new ForbiddenException();
    }
  }

  private async adminStats() {
    const [
      coursesActive,
      coursesClosed,
      students,
      trainers,
      coordinators,
      admins,
      clients,
      enrollments,
      exams,
      evaluations,
    ] = await Promise.all([
      this.prisma.course.count({ where: { isClosed: false } }),
      this.prisma.course.count({ where: { isClosed: true } }),
      this.prisma.student.count(),
      this.prisma.trainer.count(),
      this.prisma.coordinator.count(),
      this.prisma.admin.count(),
      this.prisma.client.count(),
      this.prisma.enrollment.count(),
      this.prisma.exam.count(),
      this.prisma.evaluation.count(),
    ]);
    return {
      role: 'admin',
      coursesActive,
      coursesClosed,
      students,
      trainers,
      coordinators,
      admins,
      clients,
      enrollments,
      exams,
      evaluations,
    };
  }

  private async trainerStats(userId: string) {
    const trainer = await this.prisma.trainer.findUnique({ where: { userId } });
    if (!trainer) return { role: 'trainer', courses: 0, students: 0, exams: 0 };
    const [courses, students, exams] = await Promise.all([
      this.prisma.course.count({ where: { trainerId: trainer.id } }),
      this.prisma.enrollment.count({ where: { course: { trainerId: trainer.id } } }),
      this.prisma.exam.count({ where: { course: { trainerId: trainer.id } } }),
    ]);
    return { role: 'trainer', courses, students, exams };
  }

  private async studentStats(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { userId } });
    if (!student) {
      return { role: 'student', enrolledCourses: 0, examResults: 0 };
    }
    const [enrolledCourses, examResults] = await Promise.all([
      this.prisma.enrollment.count({ where: { studentId: student.id } }),
      this.prisma.examResult.count({ where: { studentId: student.id } }),
    ]);
    return { role: 'student', enrolledCourses, examResults };
  }

  private async clientStats(userId: string) {
    const client = await this.prisma.client.findUnique({ where: { userId } });
    if (!client) return { role: 'client', courses: 0, students: 0 };
    const [courses, students] = await Promise.all([
      this.prisma.course.count({ where: { clientId: client.id } }),
      this.prisma.enrollment.count({ where: { course: { clientId: client.id } } }),
    ]);
    return { role: 'client', courses, students };
  }
}
