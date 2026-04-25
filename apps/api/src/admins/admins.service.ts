import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PasswordService } from '../common/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async create(dto: CreateAdminDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await this.password.hash(dto.password);
    return this.prisma.admin.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        user: { create: { email: dto.email, passwordHash, role: Role.ADMIN } },
      },
      include: { user: { select: { id: true, email: true, isActive: true, role: true } } },
    });
  }

  list() {
    return this.prisma.admin.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, isActive: true, role: true } } },
    });
  }

  async findOne(id: string) {
    const a = await this.prisma.admin.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true, role: true } } },
    });
    if (!a) throw new NotFoundException('Admin not found');
    return a;
  }

  async update(id: string, dto: UpdateAdminDto) {
    await this.ensureExists(id);
    return this.prisma.admin.update({
      where: { id },
      data: dto,
      include: { user: { select: { id: true, email: true, isActive: true, role: true } } },
    });
  }

  async remove(id: string) {
    const a = await this.ensureExists(id);
    if (a.user?.role === Role.SUPER_ADMIN) {
      // never allow deleting the SuperAdmin via this endpoint
      throw new ConflictException('Cannot delete SuperAdmin via this endpoint');
    }
    await this.prisma.user.delete({ where: { id: a.userId } });
    return { id };
  }

  private async ensureExists(id: string) {
    const a = await this.prisma.admin.findUnique({
      where: { id },
      include: { user: { select: { role: true } } },
    });
    if (!a) throw new NotFoundException('Admin not found');
    return a;
  }
}
