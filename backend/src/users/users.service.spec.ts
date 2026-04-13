jest.mock('../auth/two-factor.service', () => ({
  TwoFactorService: class TwoFactorService {},
}));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from '../auth/two-factor.service';
import { UserRole } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  const audit = { logEvent: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };
  const twoFactor = { clearTotpAndBackupCodes: jest.fn() };

  const ctx = {
    tenantId: 't1',
    actorUserId: 'admin-1',
    ip: null as string | null,
    userAgent: null as string | null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: TwoFactorService, useValue: twoFactor },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  it('update throws when user missing', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.update('missing-id', { displayName: 'x' }, ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update throws when no fields provided', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      role: UserRole.ADMIN,
      active: true,
      tenantId: 't1',
    });

    await expect(service.update('u1', {}, ctx)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('update blocks removing the last active admin', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'only-admin',
      role: UserRole.ADMIN,
      active: true,
      tenantId: 't1',
    });
    prisma.user.count.mockResolvedValue(0);

    await expect(
      service.update('only-admin', { active: false }, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
