import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';
import type { JwtPayload } from './types/jwt-payload.interface';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: { id: string; email: string; role: string };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueSession(user.id, user.email, user.role);
  }

  async refresh(rawRefreshToken: string): Promise<LoginResult> {
    let rotated;
    try {
      rotated = await this.tokens.rotateRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: rotated.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User no longer active');

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.tokens.signAccessToken(payload);

    return {
      accessToken,
      refreshToken: rotated.newToken,
      refreshExpiresAt: rotated.expiresAt,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (rawRefreshToken) {
      await this.tokens.revokeRefreshToken(rawRefreshToken);
    }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        emailConfirmed: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueSession(
    userId: string,
    email: string,
    role: JwtPayload['role'],
  ): Promise<LoginResult> {
    const payload: JwtPayload = { sub: userId, email, role };
    const accessToken = this.tokens.signAccessToken(payload);
    const refresh = await this.tokens.issueRefreshToken(userId);
    return {
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
      user: { id: userId, email, role },
    };
  }
}
