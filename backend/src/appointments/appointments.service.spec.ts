import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  const prisma = {
    patient: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
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
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  it('create rejects when ends before starts', async () => {
    prisma.patient.findUnique.mockResolvedValue({ id: 'p1' });
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

    await expect(
      service.create(
        {
          patientId: 'p1',
          startsAt: '2026-04-12T14:00:00.000Z',
          endsAt: '2026-04-12T13:00:00.000Z',
        },
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
