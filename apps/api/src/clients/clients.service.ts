import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PasswordService } from '../common/password.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async create(dto: CreateClientDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await this.password.hash(dto.password);
    return this.prisma.client.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        user: { create: { email: dto.email, passwordHash, role: Role.CLIENT } },
      },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  list() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.client.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });
    if (!c) throw new NotFoundException('Client not found');
    return c;
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.ensureExists(id);
    return this.prisma.client.update({
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
    const c = await this.prisma.client.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Client not found');
    return c;
  }
}
