import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExamDto) {
    const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
    if (!course) throw new NotFoundException('Course not found');
    return this.prisma.exam.create({
      data: {
        courseId: dto.courseId,
        examName: dto.examName,
        examDate: new Date(dto.examDate),
        totalMarks: dto.totalMarks,
        examType: dto.examType,
      },
    });
  }

  listByCourse(courseId: string) {
    return this.prisma.exam.findMany({
      where: { courseId },
      orderBy: { examDate: 'asc' },
      include: { _count: { select: { questions: true, results: true } } },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { id: 'asc' } },
        course: { select: { id: true, courseName: true } },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async update(id: string, dto: UpdateExamDto) {
    await this.ensureExists(id);
    return this.prisma.exam.update({
      where: { id },
      data: {
        examName: dto.examName,
        totalMarks: dto.totalMarks,
        ...(dto.examDate ? { examDate: new Date(dto.examDate) } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.exam.delete({ where: { id } });
    return { id };
  }

  private async ensureExists(id: string) {
    const e = await this.prisma.exam.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Exam not found');
    return e;
  }
}
