import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TreatmentNotesService } from './treatment-notes.service';

describe('TreatmentNotesService', () => {
  let service: TreatmentNotesService;
  const prisma = {
    patient: { count: jest.fn() },
    appointment: { findUnique: jest.fn() },
    treatmentNote: {
      create: jest.fn(),
      findMany: jest.fn(),
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
      ],
    }).compile();

    service = module.get(TreatmentNotesService);
  });

  it('create rejects when appointment patient mismatch', async () => {
    prisma.patient.count.mockResolvedValue(1);
    prisma.appointment.findUnique.mockResolvedValue({
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
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
