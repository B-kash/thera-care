import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let service: PatientsService;
  const prisma = {
    patient: {
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
        PatientsService,
        { provide: PrismaService, useValue: prisma },
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
    );

    expect(prisma.patient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          firstName: 'Ann',
          lastName: 'Lee',
          email: 'a@b.com',
          createdByUserId: 'user-1',
        }),
      }),
    );
  });

  it('findOne throws when missing', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
