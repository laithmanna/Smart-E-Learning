import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './types/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: JwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });
  }

  async issueRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(48).toString('hex');
    const tokenHash = await bcrypt.hash(token, 10);
    const ttlDays = this.parseDays(
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { token: `${userId}.${token}`, expiresAt };
  }

  async rotateRefreshToken(rawToken: string): Promise<{
    userId: string;
    newToken: string;
    expiresAt: Date;
  }> {
    const { userId, secret } = this.parseRawToken(rawToken);

    const candidates = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    let matched: (typeof candidates)[number] | undefined;
    for (const c of candidates) {
      if (await bcrypt.compare(secret, c.tokenHash)) {
        matched = c;
        break;
      }
    }
    if (!matched) {
      throw new Error('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    const issued = await this.issueRefreshToken(userId);
    return { userId, newToken: issued.token, expiresAt: issued.expiresAt };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    try {
      const { userId, secret } = this.parseRawToken(rawToken);
      const candidates = await this.prisma.refreshToken.findMany({
        where: { userId, revokedAt: null },
      });
      for (const c of candidates) {
        if (await bcrypt.compare(secret, c.tokenHash)) {
          await this.prisma.refreshToken.update({
            where: { id: c.id },
            data: { revokedAt: new Date() },
          });
          return;
        }
      }
    } catch {
      // swallow — logout should be idempotent
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private parseRawToken(raw: string): { userId: string; secret: string } {
    const idx = raw.indexOf('.');
    if (idx === -1) throw new Error('Malformed refresh token');
    const userId = raw.slice(0, idx);
    const secret = raw.slice(idx + 1);
    if (!userId || !secret) throw new Error('Malformed refresh token');
    return { userId, secret };
  }

  private parseDays(value: string): number {
    const m = /^(\d+)d$/.exec(value);
    return m && m[1] ? parseInt(m[1], 10) : 7;
  }
}
