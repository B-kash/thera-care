import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ExercisePlansService } from './exercise-plans.service';

describe('ExercisePlansService', () => {
  let service: ExercisePlansService;
  const prisma = {
    patient: { count: jest.fn() },
    exercisePlan: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    exerciseItem: {
      create: jest.fn(),
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
      ],
    }).compile();

    service = module.get(ExercisePlansService);
  });

  it('create throws when patient missing', async () => {
    prisma.patient.count.mockResolvedValue(0);

    await expect(
      service.create({ patientId: 'p1', title: 'Plan A' }, 'u1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
