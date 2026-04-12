import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgressRecordDto } from './dto/create-progress-record.dto';
import { ListProgressQueryDto } from './dto/list-progress-query.dto';
import { UpdateProgressRecordDto } from './dto/update-progress-record.dto';

const patientMini = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const authorMini = {
  select: { id: true, displayName: true, email: true },
} as const;

const recordSelect = {
  id: true,
  patientId: true,
  authorUserId: true,
  painLevel: true,
  mobilityScore: true,
  notes: true,
  recordedOn: true,
  createdAt: true,
  updatedAt: true,
  patient: patientMini,
  author: authorMini,
} satisfies Prisma.ProgressRecordSelect;

export type ProgressRecordDto = Prisma.ProgressRecordGetPayload<{
  select: typeof recordSelect;
}>;

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateProgressRecordDto,
    authorUserId: string,
  ): Promise<ProgressRecordDto> {
    await this.ensurePatientExists(dto.patientId);

    return this.prisma.progressRecord.create({
      data: {
        patientId: dto.patientId,
        authorUserId,
        painLevel: dto.painLevel,
        mobilityScore: dto.mobilityScore ?? null,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        recordedOn: parseDateOnly(dto.recordedOn),
      },
      select: recordSelect,
    });
  }

  async findAllForPatient(
    query: ListProgressQueryDto,
  ): Promise<ProgressRecordDto[]> {
    return this.prisma.progressRecord.findMany({
      where: { patientId: query.patientId },
      orderBy: [{ recordedOn: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      select: recordSelect,
    });
  }

  async findOne(id: string): Promise<ProgressRecordDto> {
    const row = await this.prisma.progressRecord.findUnique({
      where: { id },
      select: recordSelect,
    });
    if (!row) {
      throw new NotFoundException('Progress record not found');
    }
    return row;
  }

  async update(
    id: string,
    dto: UpdateProgressRecordDto,
  ): Promise<ProgressRecordDto> {
    const existing = await this.prisma.progressRecord.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Progress record not found');
    }

    const data: Prisma.ProgressRecordUpdateInput = {};
    if (dto.painLevel !== undefined) {
      data.painLevel = dto.painLevel;
    }
    if (dto.mobilityScore !== undefined) {
      data.mobilityScore = dto.mobilityScore;
    }
    if (dto.notes !== undefined) {
      data.notes =
        dto.notes === null || dto.notes === ''
          ? null
          : String(dto.notes).trim();
    }
    if (dto.recordedOn !== undefined && dto.recordedOn !== '') {
      data.recordedOn = parseDateOnly(dto.recordedOn);
    }

    return this.prisma.progressRecord.update({
      where: { id },
      data,
      select: recordSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const n = await this.prisma.progressRecord.count({ where: { id } });
    if (n === 0) {
      throw new NotFoundException('Progress record not found');
    }
    await this.prisma.progressRecord.delete({ where: { id } });
  }

  private async ensurePatientExists(patientId: string): Promise<void> {
    const n = await this.prisma.patient.count({ where: { id: patientId } });
    if (n === 0) {
      throw new NotFoundException('Patient not found');
    }
  }
}

/** Parse YYYY-MM-DD as UTC calendar date for @db.Date storage. */
function parseDateOnly(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    return new Date(isoDate);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 0, 0, 0, 0));
}
