import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { TwoFactorService } from '../auth/two-factor.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  findAllSafe(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        displayName: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async adminClearTwoFactor(actor: RequestUser, targetUserId: string) {
    if (actor.userId === targetUserId) {
      throw new BadRequestException(
        "Clear another user's 2FA from the admin path, or disable your own 2FA in Security with password + code.",
      );
    }
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!target) {
      throw new NotFoundException('User not found in this clinic');
    }
    await this.twoFactor.clearTotpAndBackupCodes(target.id);
    return { ok: true as const, userId: target.id };
  }
}
