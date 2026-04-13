import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
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

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const tenant = await this.resolveTenant(dto.tenantSlug);
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, tenantId: tenant.id },
    });
    if (!user?.passwordHash) {
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
        tenantId: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
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
