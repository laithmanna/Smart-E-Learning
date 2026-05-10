import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentCategory, Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';
import { uploadDiskPath } from '../common/uploads';
import { PrismaService } from '../prisma/prisma.service';

const VALID_CATEGORIES: AttachmentCategory[] = [
  AttachmentCategory.MATERIAL,
  AttachmentCategory.TOPICS,
  AttachmentCategory.PRESENTATION,
  AttachmentCategory.CERTIFICATE,
  AttachmentCategory.OTHER,
];

@Injectable()
export class AttachmentsService {
  constructor(private readonly prisma: PrismaService) {}

  parseCategory(input?: string | null): AttachmentCategory {
    if (!input) return AttachmentCategory.OTHER;
    const upper = input.toUpperCase() as AttachmentCategory;
    if (!VALID_CATEGORIES.includes(upper)) {
      throw new BadRequestException(
        `Invalid category. Allowed: ${VALID_CATEGORIES.join(', ')}`,
      );
    }
    return upper;
  }

  async create(
    courseId: string,
    fileName: string,
    filePath: string,
    category: AttachmentCategory,
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.courseAttachment.create({
      data: { courseId, fileName, filePath, category },
    });
  }

  listByCourse(courseId: string, category?: AttachmentCategory) {
    const where: Prisma.CourseAttachmentWhereInput = { courseId };
    if (category) where.category = category;
    return this.prisma.courseAttachment.findMany({
      where,
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Hub view: list all attachments of a given category across every course
   * the user can see. Used by the "Attachments" hub pages.
   */
  listAllByCategory(category: AttachmentCategory, courseIds: string[]) {
    return this.prisma.courseAttachment.findMany({
      where: {
        category,
        courseId: { in: courseIds },
      },
      include: {
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
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async remove(id: string) {
    const att = await this.prisma.courseAttachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Attachment not found');
    try {
      await unlink(uploadDiskPath(att.filePath));
    } catch {
      // file already gone — ignore
    }
    await this.prisma.courseAttachment.delete({ where: { id } });
    return { id };
  }
}
