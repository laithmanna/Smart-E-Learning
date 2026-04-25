import { Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(courseId: string, fileName: string, filePath: string) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.courseAttachment.create({
      data: { courseId, fileName, filePath },
    });
  }

  listByCourse(courseId: string) {
    return this.prisma.courseAttachment.findMany({
      where: { courseId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async remove(id: string) {
    const att = await this.prisma.courseAttachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Attachment not found');
    try {
      await unlink(join(process.cwd(), att.filePath));
    } catch {
      // file already gone — ignore
    }
    await this.prisma.courseAttachment.delete({ where: { id } });
    return { id };
  }
}
