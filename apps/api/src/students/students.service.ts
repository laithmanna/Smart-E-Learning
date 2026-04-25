import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PasswordService } from '../common/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async create(dto: CreateStudentDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await this.password.hash(dto.password);

    return this.prisma.student.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        socialId: dto.socialId,
        gender: dto.gender,
        user: {
          create: {
            email: dto.email,
            passwordHash,
            role: Role.STUDENT,
          },
        },
      },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  list() {
    return this.prisma.student.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.ensureExists(id);
    return this.prisma.student.update({
      where: { id },
      data: dto,
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  async remove(id: string) {
    const student = await this.ensureExists(id);
    await this.prisma.user.delete({ where: { id: student.userId } });
    return { id };
  }

  private async ensureExists(id: string) {
    const s = await this.prisma.student.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Student not found');
    return s;
  }
}
