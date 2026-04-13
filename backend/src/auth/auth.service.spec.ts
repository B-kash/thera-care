import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

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
});
