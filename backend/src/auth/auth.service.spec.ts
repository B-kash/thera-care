jest.mock('./two-factor.service', () => ({
  TwoFactorService: class TwoFactorService {},
}));

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    tenant: { findUnique: jest.fn() },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
  const pre2faJwt = {
    signAsync: jest.fn().mockResolvedValue('pre-auth-token'),
    verifyAsync: jest.fn(),
  };
  const twoFactor = {
    verifyTotpOrBackup: jest.fn(),
    startEnrollment: jest.fn(),
    confirmEnrollment: jest.fn(),
    cancelEnrollment: jest.fn(),
    clearTotpAndBackupCodes: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tid',
      name: 'Default',
      slug: 'default',
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: 'PRE_2FA_JWT', useValue: pre2faJwt },
        { provide: TwoFactorService, useValue: twoFactor },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('register creates user and returns token', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'hash',
      role: UserRole.THERAPIST,
      tenantId: 'tid',
    });

    await expect(
      service.register({
        email: 'a@b.com',
        password: 'password1',
      }),
    ).resolves.toEqual({ accessToken: 'signed-jwt' });

    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      email: 'a@b.com',
      role: UserRole.THERAPIST,
      tenantId: 'tid',
    });
  });

  it('register throws when email exists', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'x' });

    await expect(
      service.register({ email: 'a@b.com', password: 'password1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login throws when user missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.login({ email: 'a@b.com', password: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login returns preAuthToken when TOTP is enabled', async () => {
    const compareSpy = jest
      .spyOn(bcrypt, 'compare')
      .mockResolvedValueOnce(true as never);
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      role: UserRole.THERAPIST,
      tenantId: 'tid',
      totpEnabled: true,
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'any' }),
    ).resolves.toEqual({
      twoFactorRequired: true,
      preAuthToken: 'pre-auth-token',
    });
    expect(pre2faJwt.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      typ: 'pre_2fa',
      tenantId: 'tid',
    });
    expect(jwt.signAsync).not.toHaveBeenCalled();
    compareSpy.mockRestore();
  });
});
