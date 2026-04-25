import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PasswordService } from '../common/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoordinatorDto } from './dto/create-coordinator.dto';
import { UpdateCoordinatorDto } from './dto/update-coordinator.dto';

@Injectable()
export class CoordinatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async create(dto: CreateCoordinatorDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await this.password.hash(dto.password);
    return this.prisma.coordinator.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        user: {
          create: { email: dto.email, passwordHash, role: Role.COORDINATOR },
        },
      },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  list() {
    return this.prisma.coordinator.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.coordinator.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
    if (!c) throw new NotFoundException('Coordinator not found');
    return c;
  }

  async update(id: string, dto: UpdateCoordinatorDto) {
    await this.ensureExists(id);
    return this.prisma.coordinator.update({
      where: { id },
      data: dto,
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  async remove(id: string) {
    const c = await this.ensureExists(id);
    await this.prisma.user.delete({ where: { id: c.userId } });
    return { id };
  }

  private async ensureExists(id: string) {
    const c = await this.prisma.coordinator.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Coordinator not found');
    return c;
  }
}
