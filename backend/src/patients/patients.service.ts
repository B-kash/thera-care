import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

const patientSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  dateOfBirth: true,
  notes: true,
  createdByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PatientSelect;

export type PatientDto = Prisma.PatientGetPayload<{
  select: typeof patientSelect;
}>;

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreatePatientDto,
    createdByUserId: string,
  ): Promise<PatientDto> {
    return this.prisma.patient.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        notes: dto.notes?.trim() || null,
        createdByUserId,
      },
      select: patientSelect,
    });
  }

  async findAll(query: ListPatientsQueryDto): Promise<PatientDto[]> {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const q = query.q?.trim();

    const where: Prisma.PatientWhereInput | undefined = q
      ? {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined;

    return this.prisma.patient.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      skip,
      take,
      select: patientSelect,
    });
  }

  async findOne(id: string): Promise<PatientDto> {
    const row = await this.prisma.patient.findUnique({
      where: { id },
      select: patientSelect,
    });
    if (!row) {
      throw new NotFoundException('Patient not found');
    }
    return row;
  }

  async update(id: string, dto: UpdatePatientDto): Promise<PatientDto> {
    await this.ensureExists(id);

    const data: Prisma.PatientUpdateInput = {};
    if (dto.firstName !== undefined) {
      data.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined) {
      data.lastName = dto.lastName.trim();
    }
    if (dto.email !== undefined) {
      data.email = dto.email?.trim() || null;
    }
    if (dto.phone !== undefined) {
      data.phone = dto.phone?.trim() || null;
    }
    if (dto.dateOfBirth !== undefined) {
      data.dateOfBirth =
        dto.dateOfBirth === null ? null : new Date(dto.dateOfBirth);
    }
    if (dto.notes !== undefined) {
      data.notes = dto.notes === null ? null : dto.notes.trim();
    }

    return this.prisma.patient.update({
      where: { id },
      data,
      select: patientSelect,
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.patient.delete({ where: { id } });
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.patient.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException('Patient not found');
    }
  }
}
