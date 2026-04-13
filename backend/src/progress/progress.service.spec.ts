import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';

const ctx = {
  tenantId: 't1',
  actorUserId: 'u1',
  ip: null as string | null,
  userAgent: null as string | null,
};

describe('ProgressService', () => {
  let service: ProgressService;
  const audit = { logEvent: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    patient: { count: jest.fn() },
    progressRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(ProgressService);
  });

  it('create throws when patient missing', async () => {
    prisma.patient.count.mockResolvedValue(0);

    await expect(
      service.create(
        {
          patientId: 'p1',
          painLevel: 3,
          recordedOn: '2026-04-12',
        },
        'u1',
        't1',
        ctx,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
