import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;
  const prisma = {
    patient: { count: jest.fn() },
    progressRecord: {
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
      providers: [ProgressService, { provide: PrismaService, useValue: prisma }],
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
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
