import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PasswordService } from '../common/password.service';
import { generateTempPassword } from '../common/temp-password.util';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from '../auth/token.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
    private readonly tokens: TokenService,
  ) {}

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
