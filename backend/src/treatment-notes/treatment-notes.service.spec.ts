import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { TreatmentNotesService } from './treatment-notes.service';

const ctx = {
  tenantId: 't1',
  actorUserId: 'u1',
  ip: null,
  userAgent: null,
};

describe('TreatmentNotesService', () => {
  let service: TreatmentNotesService;
  const audit = { logEvent: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    patient: { count: jest.fn() },
    appointment: { findFirst: jest.fn(), findUnique: jest.fn() },
    treatmentNote: {
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
        TreatmentNotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(TreatmentNotesService);
  });

  it('create rejects when appointment patient mismatch', async () => {
    prisma.patient.count.mockResolvedValue(1);
    prisma.appointment.findFirst.mockResolvedValue({
      id: 'a1',
      patientId: 'other-patient',
    });

    await expect(
      service.create(
        {
          patientId: 'p1',
          appointmentId: 'a1',
          subjective: 's',
          objective: 'o',
          assessment: 'a',
          plan: 'p',
        },
        'u1',
        't1',
        ctx,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
