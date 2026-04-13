import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { isPublicRegisterAllowed } from './public-register.util';
import { AccessTokenPayload } from './strategies/jwt.strategy';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    if (!isPublicRegisterAllowed()) {
      throw new ForbiddenException('Public registration is disabled');
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName?.trim() || null,
      },
    });

    return {
      accessToken: await this.signAccessToken(user.id, user.email, user.role),
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
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
      accessToken: await this.signAccessToken(user.id, user.email, user.role),
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
        createdAt: true,
        updatedAt: true,
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

  private signAccessToken(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<string> {
    const payload: AccessTokenPayload = { sub: userId, email, role };
    return this.jwt.signAsync(payload);
  }
}
