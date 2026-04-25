import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async mark(classId: string, studentId: string, present: boolean) {
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('Class not found');

    return this.prisma.attendance.upsert({
      where: { classId_studentId: { classId, studentId } },
      update: { present },
      create: { classId, studentId, present, date: klass.classDate },
    });
  }

  async bulkMark(classId: string, entries: { studentId: string; present: boolean }[]) {
    const klass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!klass) throw new NotFoundException('Class not found');

    const ops = entries.map((e) =>
      this.prisma.attendance.upsert({
        where: { classId_studentId: { classId, studentId: e.studentId } },
        update: { present: e.present },
        create: {
          classId,
          studentId: e.studentId,
          present: e.present,
          date: klass.classDate,
        },
      }),
    );
    const result = await this.prisma.$transaction(ops);
    return { count: result.length };
  }

  list(filter: { classId?: string; studentId?: string; courseId?: string }) {
    const where: Prisma.AttendanceWhereInput = {};
    if (filter.classId) where.classId = filter.classId;
    if (filter.studentId) where.studentId = filter.studentId;
    if (filter.courseId) where.class = { courseId: filter.courseId };

    return this.prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            user: { select: { email: true } },
          },
        },
        class: { select: { id: true, topic: true, classDate: true, courseId: true } },
      },
      orderBy: [{ class: { classDate: 'asc' } }, { student: { name: 'asc' } }],
    });
  }
}
