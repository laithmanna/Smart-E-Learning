import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PasswordService } from '../common/password.service';
import { generateTempPassword } from '../common/temp-password.util';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

export interface UpdateMyProfileDto {
  name?: string;
  phone?: string | null;
  // Trainer-only extras
  specialization?: string | null;
  about?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  // ----- Self profile -----
  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        admin: true,
        coordinator: true,
        trainer: true,
        student: true,
        client: true,
      },
    });
    if (!user) throw new NotFoundException();

    const profile =
      user.admin ?? user.coordinator ?? user.trainer ?? user.student ?? user.client ?? null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailConfirmed: user.emailConfirmed,
      createdAt: user.createdAt,
      profile,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { admin: true, coordinator: true, trainer: true, student: true, client: true },
    });
    if (!user) throw new NotFoundException();

    const data: Record<string, unknown> = {};
    if (typeof dto.name === 'string' && dto.name.trim().length > 0) data.name = dto.name.trim();
    if (dto.phone !== undefined) data.phone = dto.phone === '' ? null : dto.phone;

    switch (user.role) {
      case Role.SUPER_ADMIN:
      case Role.ADMIN: {
        if (!user.admin) throw new NotFoundException('Admin profile not found');
        const updated = await this.prisma.admin.update({
          where: { id: user.admin.id },
          data,
        });
        return { profile: updated };
      }
      case Role.COORDINATOR: {
        if (!user.coordinator) throw new NotFoundException();
        const updated = await this.prisma.coordinator.update({
          where: { id: user.coordinator.id },
          data,
        });
        return { profile: updated };
      }
      case Role.TRAINER: {
        if (!user.trainer) throw new NotFoundException();
        if (dto.specialization !== undefined) {
          data.specialization = dto.specialization === '' ? null : dto.specialization;
        }
        if (dto.about !== undefined) data.about = dto.about === '' ? null : dto.about;
        const updated = await this.prisma.trainer.update({
          where: { id: user.trainer.id },
          data,
        });
        return { profile: updated };
      }
      case Role.STUDENT: {
        if (!user.student) throw new NotFoundException();
        const updated = await this.prisma.student.update({
          where: { id: user.student.id },
          data,
        });
        return { profile: updated };
      }
      case Role.CLIENT: {
        if (!user.client) throw new NotFoundException();
        const updated = await this.prisma.client.update({
          where: { id: user.client.id },
          data,
        });
        return { profile: updated };
      }
      default:
        throw new BadRequestException('Unsupported role');
    }
  }

  async changeOwnPassword(userId: string, current: string, next: string) {
    if (current === next) {
      throw new BadRequestException('New password must differ from current');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const ok = await this.password.compare(current, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Current password is incorrect');

    const passwordHash = await this.password.hash(next);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.tokens.revokeAllForUser(userId);
    return { ok: true };
  }

  async resetPasswordByAdmin(targetUserId: string): Promise<{ tempPassword: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException();

    const tempPassword = generateTempPassword();
    const passwordHash = await this.password.hash(tempPassword);
    await this.prisma.user.update({ where: { id: targetUserId }, data: { passwordHash } });
    await this.tokens.revokeAllForUser(targetUserId);
    return { tempPassword };
  }

  async setActive(targetUserId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException();
    await this.prisma.user.update({ where: { id: targetUserId }, data: { isActive } });
    if (!isActive) await this.tokens.revokeAllForUser(targetUserId);
    return { id: targetUserId, isActive };
  }
}
