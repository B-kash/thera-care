import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

const ctx = {
  tenantId: 't1',
  actorUserId: 'u1',
  ip: null as string | null,
  userAgent: null as string | null,
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  const audit = { logEvent: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    patient: { findFirst: jest.fn(), findUnique: jest.fn() },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  it('create rejects when ends before starts', async () => {
    prisma.patient.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.user.findFirst.mockResolvedValue({ id: 'u1' });

    await expect(
      service.create(
        {
          patientId: 'p1',
          startsAt: '2026-04-12T14:00:00.000Z',
          endsAt: '2026-04-12T13:00:00.000Z',
        },
        'u1',
        't1',
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
