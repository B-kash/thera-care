import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';

const USER_ROLES: readonly string[] = ['ADMIN', 'THERAPIST', 'STAFF'];

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role?: string;
  tenantId?: string;
};

export type RequestUser = {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
};

function cookieExtractor(req: Request): string | null {
  const raw = req?.cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

function parseRole(value: unknown): UserRole {
  if (typeof value === 'string' && USER_ROLES.includes(value)) {
    return value as UserRole;
  }
  return 'THERAPIST';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    const base = {
      userId: payload.sub,
      email: payload.email,
      role: parseRole(payload.role),
    };
    if (typeof payload.tenantId === 'string' && payload.tenantId.length > 0) {
      return { ...base, tenantId: payload.tenantId };
    }
    const row = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tenantId: true },
    });
    if (!row) {
      throw new UnauthorizedException();
    }
    return { ...base, tenantId: row.tenantId };
  }
}
