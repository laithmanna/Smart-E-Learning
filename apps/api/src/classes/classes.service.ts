import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  listByCourse(courseId: string) {
    return this.prisma.class.findMany({
      where: { courseId },
      orderBy: { classDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.class.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Class not found');
    return c;
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.findOne(id);
    const data: Prisma.ClassUpdateInput = {
      topic: dto.topic,
      startTime: dto.startTime,
      endTime: dto.endTime,
      location: dto.location,
      meetingLink: dto.meetingLink,
    };
    if (dto.classDate) data.classDate = new Date(dto.classDate);
    return this.prisma.class.update({ where: { id }, data });
  }
}
