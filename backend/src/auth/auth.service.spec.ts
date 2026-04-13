import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { EmailAuthTokenService } from './email-auth-token.service';
import { MailerService } from './mailer.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    tenant: { findUnique: jest.fn() },
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed-jwt') };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_ORIGIN') return 'http://localhost:3000';
      return undefined;
    }),
  };
  const tokens = {
    issue: jest.fn().mockResolvedValue('raw-one-time-token'),
    consume: jest.fn(),
  };
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };

  afterEach(() => {
    delete process.env.ALLOW_PUBLIC_REGISTER;
  });

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
        { provide: ConfigService, useValue: config },
        { provide: EmailAuthTokenService, useValue: tokens },
        { provide: MailerService, useValue: mailer },
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

  it('register throws when public registration is disabled', async () => {
    process.env.ALLOW_PUBLIC_REGISTER = 'false';

    await expect(
      service.register({ email: 'a@b.com', password: 'password1' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
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

  it('login throws when user is inactive', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      passwordHash: 'hash',
      active: false,
      tenantId: 'tid',
      role: UserRole.THERAPIST,
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'any' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('requestPasswordReset sends mail when user exists with password', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      active: true,
      passwordHash: 'x',
    });

    await service.requestPasswordReset('A@B.com');

    expect(tokens.issue).toHaveBeenCalled();
    expect(mailer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.com',
        subject: expect.stringContaining('password') as unknown,
      }),
    );
  });

  it('requestPasswordReset skips mail when user unknown', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await service.requestPasswordReset('nobody@b.com');

    expect(tokens.issue).not.toHaveBeenCalled();
    expect(mailer.send).not.toHaveBeenCalled();
  });
});
