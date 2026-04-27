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

  // ----- Hero stats: classes today + attendance/stats -----
  async getToday(user: AuthenticatedUser) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const tomorrow = new Date(start);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const courseFilter = await this.scopeCourses(user);

    const [classesToday, courseCount, studentsTotal, attendance] = await Promise.all([
      this.prisma.class.count({
        where: {
          classDate: { gte: start, lt: tomorrow },
          course: courseFilter,
        },
      }),
      this.prisma.course.count({ where: { ...courseFilter, isClosed: false } }),
      this.prisma.enrollment.count({
        where: { course: { ...courseFilter, isClosed: false } },
      }),
      this.prisma.attendance.findMany({
        where: { class: { course: courseFilter } },
        select: { present: true },
      }),
    ]);

    const totalAttendance = attendance.length;
    const presentCount = attendance.filter((a) => a.present).length;
    const attendancePct = totalAttendance
      ? Math.round((presentCount / totalAttendance) * 100)
      : null;

    return {
      classesToday,
      activeCourses: courseCount,
      students: studentsTotal,
      attendancePct,
    };
  }

  // ----- Up next: upcoming classes (today through next 7 days) -----
  async getUpNext(user: AuthenticatedUser, limit = 6) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const horizon = new Date(start);
    horizon.setDate(horizon.getDate() + 7);

    const courseFilter = await this.scopeCourses(user);

    const classes = await this.prisma.class.findMany({
      where: {
        classDate: { gte: start, lte: horizon },
        course: { ...courseFilter, isClosed: false },
      },
      include: {
        course: {
          select: {
            courseName: true,
            trainer: { select: { name: true } },
            client: { select: { name: true } },
            _count: { select: { enrollments: true } },
          },
        },
      },
      orderBy: [{ classDate: 'asc' }, { startTime: 'asc' }],
      take: limit,
    });

    const now = new Date();
    return classes.map((c) => {
      const d = new Date(c.classDate);
      const day = String(d.getDate()).padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();

      // Compute live / pending / scheduled
      const [sh, sm] = c.startTime.split(':').map((n) => parseInt(n, 10));
      const [eh, em] = c.endTime.split(':').map((n) => parseInt(n, 10));
      const startDt = new Date(d);
      startDt.setHours(sh ?? 0, sm ?? 0, 0, 0);
      const endDt = new Date(d);
      endDt.setHours(eh ?? 0, em ?? 0, 0, 0);

      let status: 'live' | 'pending' | 'scheduled' = 'scheduled';
      let statusLabel = 'Scheduled';
      if (now >= startDt && now <= endDt) {
        status = 'live';
        statusLabel = 'Live now';
      } else if (now < startDt) {
        const hoursUntil = Math.ceil((startDt.getTime() - now.getTime()) / 36e5);
        if (hoursUntil <= 4) {
          status = 'pending';
          statusLabel = hoursUntil <= 1 ? 'Soon' : `In ${hoursUntil}h`;
        }
      }

      const metaParts: string[] = [];
      if (c.course.trainer?.name) metaParts.push(c.course.trainer.name);
      metaParts.push(`${c.startTime}–${c.endTime}`);
      if (c.location && c.location !== 'NaN') metaParts.push(c.location);

      return {
        id: c.id,
        day,
        month,
        title: `${c.course.courseName} · ${c.topic}`,
        meta: metaParts.join(' · '),
        status,
        statusLabel,
      };
    });
  }

  // ----- Enrollment momentum: last 12 weeks -----
  async getMomentum(user: AuthenticatedUser, weeks = 12) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(start.getDate() - (weeks - 1) * 7);

    const courseFilter = await this.scopeCourses(user);

    const [enrollments, examResults] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          createdAt: { gte: start },
          course: courseFilter,
        },
        select: { createdAt: true },
      }),
      this.prisma.examResult.findMany({
        where: {
          createdAt: { gte: start },
          exam: { course: courseFilter },
        },
        select: { createdAt: true },
      }),
    ]);

    const buckets: {
      label: string;
      enrollments: number;
      completions: number;
    }[] = [];

    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(start);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const enrollmentCount = enrollments.filter(
        (e) => e.createdAt >= weekStart && e.createdAt < weekEnd,
      ).length;
      const completionCount = examResults.filter(
        (r) => r.createdAt >= weekStart && r.createdAt < weekEnd,
      ).length;
      buckets.push({
        label: weekStart.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        enrollments: enrollmentCount,
        completions: completionCount,
      });
    }

    return buckets;
  }

  // ----- Helper: course filter respecting role -----
  private async scopeCourses(user: AuthenticatedUser): Promise<Record<string, unknown>> {
    switch (user.role) {
      case Role.SUPER_ADMIN:
      case Role.ADMIN:
      case Role.COORDINATOR:
        return {};
      case Role.TRAINER: {
        const t = await this.prisma.trainer.findUnique({ where: { userId: user.sub } });
        return { trainerId: t?.id ?? '__none__' };
      }
      case Role.STUDENT: {
        const s = await this.prisma.student.findUnique({ where: { userId: user.sub } });
        return { enrollments: { some: { studentId: s?.id ?? '__none__' } } };
      }
      case Role.CLIENT: {
        const c = await this.prisma.client.findUnique({ where: { userId: user.sub } });
        return { clientId: c?.id ?? '__none__' };
      }
      default:
        return {};
    }
  }
}
