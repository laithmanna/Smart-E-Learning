import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(examId: string, dto: CreateQuestionDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');
    return this.prisma.question.create({
      data: {
        examId,
        questionText: dto.questionText,
        option1: dto.option1,
        option2: dto.option2,
        option3: dto.option3,
        option4: dto.option4,
        correctOption: dto.correctOption,
      },
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    return this.prisma.question.update({
      where: { id },
      data: {
        questionText: dto.questionText,
        option1: dto.option1,
        option2: dto.option2,
        option3: dto.option3,
        option4: dto.option4,
        correctOption: dto.correctOption,
      },
    });
  }

  async remove(id: string) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    await this.prisma.question.delete({ where: { id } });
    return { id };
  }
}
