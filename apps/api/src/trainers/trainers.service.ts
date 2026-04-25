import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { PasswordService } from '../common/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

@Injectable()
export class TrainersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async create(dto: CreateTrainerDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await this.password.hash(dto.password);

    return this.prisma.trainer.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        specialization: dto.specialization,
        about: dto.about,
        user: {
          create: {
            email: dto.email,
            passwordHash,
            role: Role.TRAINER,
          },
        },
      },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  list() {
    return this.prisma.trainer.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  async findOne(id: string) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
    if (!trainer) throw new NotFoundException('Trainer not found');
    return trainer;
  }

  async update(id: string, dto: UpdateTrainerDto) {
    await this.ensureExists(id);
    return this.prisma.trainer.update({
      where: { id },
      data: dto,
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  async remove(id: string) {
    const trainer = await this.ensureExists(id);
    await Promise.all([
      this.deleteFileIfExists(trainer.photoPath),
      this.deleteFileIfExists(trainer.cvPath),
    ]);
    await this.prisma.user.delete({ where: { id: trainer.userId } });
    return { id };
  }

  async setPhoto(id: string, relativePath: string) {
    const trainer = await this.ensureExists(id);
    await this.deleteFileIfExists(trainer.photoPath);
    return this.prisma.trainer.update({
      where: { id },
      data: { photoPath: relativePath },
    });
  }

  async setCv(id: string, relativePath: string) {
    const trainer = await this.ensureExists(id);
    await this.deleteFileIfExists(trainer.cvPath);
    return this.prisma.trainer.update({
      where: { id },
      data: { cvPath: relativePath },
    });
  }

  private async ensureExists(id: string) {
    const t = await this.prisma.trainer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Trainer not found');
    return t;
  }

  private async deleteFileIfExists(relativePath: string | null) {
    if (!relativePath) return;
    try {
      await unlink(join(process.cwd(), relativePath));
    } catch {
      // file already gone — ignore
    }
  }
}
