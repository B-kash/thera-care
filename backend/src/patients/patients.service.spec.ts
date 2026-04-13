import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from './patients.service';

const tenantId = '00000000-0000-4000-8000-000000000001';

const auditCtx = {
  tenantId,
  actorUserId: 'user-1',
  ip: null,
  userAgent: null,
};

describe('PatientsService', () => {
  let service: PatientsService;
  const audit = { logEvent: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    patient: {
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
        PatientsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(PatientsService);
  });

  it('create passes trimmed fields and creator id', async () => {
    prisma.patient.create.mockResolvedValue({ id: 'p1' });

    await service.create(
      {
        firstName: '  Ann ',
        lastName: 'Lee',
        email: 'a@b.com',
      },
      'user-1',
      tenantId,
      auditCtx,
    );

    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          firstName: 'Ann',
          lastName: 'Lee',
          email: 'a@b.com',
          createdByUserId: 'user-1',
        }),
      }),
    );
  });

  it('findOne throws when missing', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.findOne(tenantId, 'missing-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
