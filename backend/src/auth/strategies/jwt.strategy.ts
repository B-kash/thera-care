import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from '../../generated/prisma/client';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';

const USER_ROLES: readonly string[] = ['ADMIN', 'THERAPIST', 'STAFF'];

export type AccessTokenPayload = {
  sub: string;
  email: string;
  role?: string;
};

export type RequestUser = {
  userId: string;
  email: string;
  role: UserRole;
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
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: AccessTokenPayload): RequestUser {
    return {
      userId: payload.sub,
      email: payload.email,
      role: parseRole(payload.role),
    };
  }
}
