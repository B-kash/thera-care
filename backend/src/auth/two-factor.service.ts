import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';
import { TotpCryptoService } from './totp-crypto.service';

const BCRYPT_ROUNDS = 10;
const BACKUP_CODE_COUNT = 10;
const TOTP_TOLERANCE_SEC = 30;

function normalizeTotpCode(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

function generatePlainBackupCodes(): string[] {
  const out: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    out.push(randomBytes(4).toString('hex'));
  }
  return out;
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly totpCrypto: TotpCryptoService,
    private readonly config: ConfigService,
  ) {}

  private issuer(): string {
    return this.config.get<string>('TOTP_ISSUER')?.trim() || 'Thera Care';
  }

  async startEnrollment(
    userId: string,
    email: string,
  ): Promise<{ secretBase32: string; otpauthUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpEnabled: true, email: true },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (user.totpEnabled) {
      throw new ConflictException('Two-factor authentication is already enabled');
    }
    const secretBase32 = generateSecret();
    const enc = this.totpCrypto.encryptUtf8(secretBase32);
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpPendingSecretEnc: enc },
    });
    const otpauthUrl = generateURI({
      issuer: this.issuer(),
      label: user.email ?? email,
      secret: secretBase32,
    });
    return { secretBase32, otpauthUrl };
  }

  async cancelEnrollment(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpPendingSecretEnc: null },
    });
  }

  async confirmEnrollment(
    userId: string,
    codeRaw: string,
  ): Promise<{ backupCodes: string[] }> {
    const code = normalizeTotpCode(codeRaw);
    if (!/^\d{6,8}$/.test(code)) {
      throw new BadRequestException('Enter the 6-digit code from your app');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpPendingSecretEnc: true, totpEnabled: true },
    });
    if (!user?.totpPendingSecretEnc) {
      throw new BadRequestException('No enrollment in progress');
    }
    if (user.totpEnabled) {
      throw new ConflictException('Two-factor authentication is already enabled');
    }
    const secret = this.totpCrypto.decryptUtf8(user.totpPendingSecretEnc);
    const { valid } = await verify({
      secret,
      token: code,
      epochTolerance: TOTP_TOLERANCE_SEC,
    });
    if (!valid) {
      throw new BadRequestException('Invalid authenticator code');
    }
    const pendingEnc = user.totpPendingSecretEnc;
    const backupCodes = generatePlainBackupCodes();
    const rows = await Promise.all(
      backupCodes.map(async (plain) => ({
        plain,
        hash: await bcrypt.hash(plain, BCRYPT_ROUNDS),
      })),
    );
    await this.prisma.$transaction(async (tx) => {
      await tx.twoFactorBackupCode.deleteMany({ where: { userId } });
      await tx.twoFactorBackupCode.createMany({
        data: rows.map((r) => ({
          userId,
          codeHash: r.hash,
        })),
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          totpEnabled: true,
          totpSecretEnc: pendingEnc,
          totpPendingSecretEnc: null,
        },
      });
    });
    return { backupCodes };
  }

  async verifyTotpOrBackup(userId: string, codeRaw: string): Promise<boolean> {
    const trimmed = codeRaw.trim().toLowerCase().replace(/\s+/g, '');
    if (!trimmed) return false;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totpEnabled: true,
        totpSecretEnc: true,
      },
    });
    if (!user?.totpEnabled || !user.totpSecretEnc) {
      return false;
    }
    const secret = this.totpCrypto.decryptUtf8(user.totpSecretEnc);
    if (/^[0-9a-f]{8}$/.test(trimmed)) {
      const okBackup = await this.consumeBackupCode(userId, trimmed);
      if (okBackup) return true;
    }
    if (/^\d{6,8}$/.test(trimmed)) {
      const { valid } = await verify({
        secret,
        token: trimmed,
        epochTolerance: TOTP_TOLERANCE_SEC,
      });
      if (valid) return true;
    }
    if (/^[0-9a-f]{8}$/.test(trimmed)) {
      return false;
    }
    return this.consumeBackupCode(userId, trimmed);
  }

  private async consumeBackupCode(
    userId: string,
    plain: string,
  ): Promise<boolean> {
    const rows = await this.prisma.twoFactorBackupCode.findMany({
      where: { userId, usedAt: null },
      select: { id: true, codeHash: true },
    });
    for (const row of rows) {
      const match = await bcrypt.compare(plain, row.codeHash);
      if (match) {
        await this.prisma.twoFactorBackupCode.update({
          where: { id: row.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  async clearTotpAndBackupCodes(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          totpEnabled: false,
          totpSecretEnc: null,
          totpPendingSecretEnc: null,
        },
      }),
    ]);
  }
}
