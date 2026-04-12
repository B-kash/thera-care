import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExercisePlansService } from './exercise-plans.service';

const ctx = {
  tenantId: 't1',
  actorUserId: 'u1',
  ip: null,
  userAgent: null,
};

describe('ExercisePlansService', () => {
  let service: ExercisePlansService;
  const audit = { logEvent: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    patient: { count: jest.fn() },
    exercisePlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    exerciseItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisePlansService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(ExercisePlansService);
  });

  it('create throws when patient missing', async () => {
    prisma.patient.count.mockResolvedValue(0);

    await expect(
      service.create({ patientId: 'p1', title: 'Plan A' }, 'u1', 't1', ctx),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
