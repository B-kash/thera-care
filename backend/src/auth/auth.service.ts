import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  EmailAuthTokenPurpose,
  type UserRole,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailAuthTokenService } from './email-auth-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailerService } from './mailer.service';
import { isPublicRegisterAllowed } from './public-register.util';
import { AccessTokenPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 10;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function passwordResetTtlMs(): number {
  const m = Number(process.env.PASSWORD_RESET_TTL_MINUTES);
  return (Number.isFinite(m) && m > 0 ? m : 60) * 60_000;
}

function magicLinkTtlMs(): number {
  const m = Number(process.env.MAGIC_LINK_TTL_MINUTES);
  return (Number.isFinite(m) && m > 0 ? m : 15) * 60_000;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly tokens: EmailAuthTokenService,
    private readonly mailer: MailerService,
  ) {}

  private appOrigin(): string {
    return (
      this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    if (!isPublicRegisterAllowed()) {
      throw new ForbiddenException('Public registration is disabled');
    }

    const tenant = await this.resolveTenant(dto.tenantSlug);
    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
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
        email,
        passwordHash,
        displayName: dto.displayName?.trim() || null,
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

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
    });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.active) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
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
        active: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    if (!user.active) {
      throw new UnauthorizedException();
    }
    return user;
  }

  /**
   * Always succeeds from the caller’s perspective (uniform JSON) to avoid email enumeration.
   */
  async requestPasswordReset(
    emailRaw: string,
    tenantSlug?: string,
  ): Promise<void> {
    const tenant = await this.resolveTenant(tenantSlug);
    const email = normalizeEmail(emailRaw);
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
      select: { id: true, active: true, passwordHash: true },
    });
    if (!user?.active || !user.passwordHash) {
      return;
    }

    const raw = await this.tokens.issue(
      user.id,
      EmailAuthTokenPurpose.PASSWORD_RESET,
      passwordResetTtlMs(),
    );
    const link = `${this.appOrigin()}/login/reset-password?token=${encodeURIComponent(raw)}`;
    await this.mailer.send({
      to: email,
      subject: 'Reset your Thera Care password',
      text: `We received a request to reset the password for ${email}.\n\nOpen this link (valid once, expires soon):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    });
  }

  async resetPasswordWithToken(
    rawToken: string,
    newPassword: string,
  ): Promise<void> {
    const consumed = await this.tokens.consume(
      rawToken,
      EmailAuthTokenPurpose.PASSWORD_RESET,
    );
    if (!consumed) {
      throw new BadRequestException(
        'This reset link is invalid or has expired.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: consumed.userId },
      data: { passwordHash },
    });
  }

  async requestMagicLink(
    emailRaw: string,
    tenantSlug?: string,
  ): Promise<void> {
    const tenant = await this.resolveTenant(tenantSlug);
    const email = normalizeEmail(emailRaw);
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId: tenant.id },
      select: { id: true, active: true },
    });
    if (!user?.active) {
      return;
    }

    const raw = await this.tokens.issue(
      user.id,
      EmailAuthTokenPurpose.MAGIC_LINK,
      magicLinkTtlMs(),
    );
    const link = `${this.appOrigin()}/login/magic?token=${encodeURIComponent(raw)}`;
    await this.mailer.send({
      to: email,
      subject: 'Sign in to Thera Care',
      text: `Use this one-time link to sign in (expires soon):\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    });
  }

  async consumeMagicLinkToken(rawToken: string): Promise<{ accessToken: string }> {
    const consumed = await this.tokens.consume(
      rawToken,
      EmailAuthTokenPurpose.MAGIC_LINK,
    );
    if (!consumed) {
      throw new BadRequestException(
        'This sign-in link is invalid or has expired.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: consumed.userId },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        tenantId: true,
      },
    });
    if (!user?.active) {
      throw new BadRequestException(
        'This sign-in link is invalid or has expired.',
      );
    }

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      user.role,
      user.tenantId,
    );
    return { accessToken };
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
