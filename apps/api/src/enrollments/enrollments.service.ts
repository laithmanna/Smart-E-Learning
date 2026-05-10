import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { uploadDiskPath } from '../common/uploads';
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
    if (existing.certificateFilePath) {
      try {
        await unlink(uploadDiskPath(existing.certificateFilePath));
      } catch {
        /* ignore */
      }
    }
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

  /** Per-student per-course certificate */
  async setCertificate(
    courseId: string,
    studentId: string,
    fileName: string,
    filePath: string,
  ) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    if (!existing) throw new NotFoundException('Enrollment not found');

    if (existing.certificateFilePath) {
      try {
        await unlink(uploadDiskPath(existing.certificateFilePath));
      } catch {
        /* ignore */
      }
    }

    return this.prisma.enrollment.update({
      where: { courseId_studentId: { courseId, studentId } },
      data: {
        certificateFileName: fileName,
        certificateFilePath: filePath,
        certificateUploadedAt: new Date(),
      },
      include: {
        student: {
          include: { user: { select: { id: true, email: true, isActive: true } } },
        },
      },
    });
  }

  async deleteCertificate(courseId: string, studentId: string) {
    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    if (!existing) throw new NotFoundException('Enrollment not found');
    if (existing.certificateFilePath) {
      try {
        await unlink(uploadDiskPath(existing.certificateFilePath));
      } catch {
        /* ignore */
      }
    }
    return this.prisma.enrollment.update({
      where: { courseId_studentId: { courseId, studentId } },
      data: {
        certificateFileName: null,
        certificateFilePath: null,
        certificateUploadedAt: null,
      },
      include: {
        student: {
          include: { user: { select: { id: true, email: true, isActive: true } } },
        },
      },
    });
  }

  /** Hub view — every enrollment WITH a certificate, scoped to allowed courseIds. */
  listCertificates(courseIds: string[]) {
    return this.prisma.enrollment.findMany({
      where: {
        courseId: { in: courseIds },
        certificateFilePath: { not: null },
      },
      include: {
        student: {
          include: { user: { select: { id: true, email: true, isActive: true } } },
        },
        course: {
          select: {
            id: true,
            courseName: true,
            startDate: true,
            endDate: true,
            trainer: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { certificateUploadedAt: 'desc' },
    });
  }
}
