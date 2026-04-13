import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteLogin2faDto } from './dto/complete-login-2fa.dto';
import { Disable2faDto } from './dto/disable-2fa.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TotpSetupConfirmDto } from './dto/totp-setup-confirm.dto';
import { AccessTokenPayload } from './strategies/jwt.strategy';
import { TwoFactorService } from './two-factor.service';

const BCRYPT_ROUNDS = 10;

export type LoginResult =
  | { accessToken: string }
  | { twoFactorRequired: true; preAuthToken: string };

type Pre2faPayload = {
  sub: string;
  typ: 'pre_2fa';
  tenantId: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject('PRE_2FA_JWT') private readonly pre2faJwt: JwtService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId: tenant.id },
    });
    if (existing) {
      throw new ConflictException(
        'An account with this email already exists for this clinic',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    return {
      accessToken: await this.signAccessToken(
        user.id,
        user.email,
        user.role,
        user.tenantId,
      ),
    };
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId: tenant.id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        tenantId: true,
        totpEnabled: true,
      },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const requireAdmin2fa =
      (process.env.REQUIRE_2FA_FOR_ADMIN ?? '').toLowerCase() === 'true';
    if (requireAdmin2fa && user.role === 'ADMIN' && !user.totpEnabled) {
      throw new ForbiddenException(
        'Administrator accounts must enroll in two-factor authentication before ' +
          'this policy is enforced. Set REQUIRE_2FA_FOR_ADMIN=false temporarily, ' +
          'have each admin enable 2FA under Security, then turn the flag back on.',
      );
    }

    if (user.totpEnabled) {
      const preAuthToken = await this.pre2faJwt.signAsync({
        sub: user.id,
        typ: 'pre_2fa',
        tenantId: user.tenantId,
      });
      return { twoFactorRequired: true, preAuthToken };
    }

    return {
      accessToken: await this.signAccessToken(
        user.id,
        user.email,
        user.role,
        user.tenantId,
      ),
    };
  }

  async completeLoginWith2fa(
    dto: CompleteLogin2faDto,
  ): Promise<{ accessToken: string }> {
    let payload: Pre2faPayload;
    try {
      payload = await this.pre2faJwt.verifyAsync<Pre2faPayload>(
        dto.preAuthToken,
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired sign-in token');
    }
    if (payload.typ !== 'pre_2fa' || typeof payload.sub !== 'string') {
      throw new UnauthorizedException('Invalid sign-in token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        totpEnabled: true,
      },
    });
    if (!user?.totpEnabled || user.tenantId !== payload.tenantId) {
      throw new UnauthorizedException();
    }
    const verified = await this.twoFactor.verifyTotpOrBackup(user.id, dto.code);
    if (!verified) {
      throw new UnauthorizedException('Invalid authenticator or backup code');
    }
    return {
      accessToken: await this.signAccessToken(
        user.id,
        user.email,
        user.role,
        user.tenantId,
      ),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        totpEnabled: true,
        totpPendingSecretEnc: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    const { totpPendingSecretEnc, ...rest } = user;
    return {
      ...rest,
      totpEnrollmentPending: Boolean(
        totpPendingSecretEnc && !user.totpEnabled,
      ),
    };
  }

  async startTotpSetup(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!u) {
      throw new UnauthorizedException();
    }
    return this.twoFactor.startEnrollment(userId, u.email);
  }

  async confirmTotpSetup(userId: string, dto: TotpSetupConfirmDto) {
    return this.twoFactor.confirmEnrollment(userId, dto.code);
  }

  async cancelTotpSetup(userId: string) {
    await this.twoFactor.cancelEnrollment(userId);
    return { ok: true as const };
  }

  async disableTotp(userId: string, dto: Disable2faDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, totpEnabled: true },
    });
    if (!user?.passwordHash) {
      throw new BadRequestException('Password sign-in is not configured');
    }
    if (!user.totpEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    const passOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passOk) {
      throw new UnauthorizedException('Invalid password');
    }
    const factorOk = await this.twoFactor.verifyTotpOrBackup(userId, dto.code);
    if (!factorOk) {
      throw new UnauthorizedException('Invalid authenticator or backup code');
    }
    await this.twoFactor.clearTotpAndBackupCodes(userId);
    return { ok: true as const };
  }

  private async resolveTenant(slug: string | undefined) {
    const s = (slug?.trim() || 'default').toLowerCase();
    const tenant = await this.prisma.tenant.findUnique({ where: { slug: s } });
    if (!tenant) {
      throw new BadRequestException(`Unknown clinic slug: ${s}`);
    }
    return tenant;
  }

  private signAccessToken(
    userId: string,
    email: string,
    role: UserRole,
    tenantId: string,
  ): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: userId,
      email,
      role,
      tenantId,
    };
    return this.jwt.signAsync(payload);
  }
}
