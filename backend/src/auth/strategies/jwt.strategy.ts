import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';

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
    const row = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        active: true,
      },
    });
    if (!row || !row.active) {
      throw new UnauthorizedException();
    }
    return {
      userId: row.id,
      email: row.email,
      role: row.role,
      tenantId: row.tenantId,
    };
  }
}
