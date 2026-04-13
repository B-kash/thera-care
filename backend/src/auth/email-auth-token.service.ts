import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import type { EmailAuthTokenPurpose } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailAuthTokenService {
  constructor(private readonly prisma: PrismaService) {}

  hashRawToken(raw: string): string {
    return createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  private generateRawToken(): string {
    return randomBytes(32).toString('base64url');
  }

  /**
   * Creates a new token; marks any prior unused tokens for this user+purpose as used.
   * @returns raw secret to embed once in the email link (never stored).
   */
  async issue(
    userId: string,
    purpose: EmailAuthTokenPurpose,
    ttlMs: number,
  ): Promise<string> {
    const raw = this.generateRawToken();
    const tokenHash = this.hashRawToken(raw);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.$transaction(async (tx) => {
      await tx.emailAuthToken.updateMany({
        where: { userId, purpose, usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.emailAuthToken.create({
        data: { userId, purpose, tokenHash, expiresAt },
      });
    });

    return raw;
  }

  /**
   * Marks the row used and returns userId, or null if invalid/expired/already used.
   */
  async consume(
    raw: string,
    purpose: EmailAuthTokenPurpose,
  ): Promise<{ userId: string } | null> {
    const tokenHash = this.hashRawToken(raw);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.emailAuthToken.findFirst({
        where: {
          tokenHash,
          purpose,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!row) {
        return null;
      }
      const updated = await tx.emailAuthToken.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (updated.count !== 1) {
        return null;
      }
      return { userId: row.userId };
    });
  }
}
