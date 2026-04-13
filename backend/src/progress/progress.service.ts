import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { AuditRequestContext } from '../audit/audit-request.util';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from '../generated/prisma/client';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateProgressRecordDto,
    authorUserId: string,
    tenantId: string,
    ctx: AuditRequestContext,
  ): Promise<ProgressRecordDto> {
    await this.ensurePatientExists(tenantId, dto.patientId);

    const row = await this.prisma.progressRecord.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorUserId,
        painLevel: dto.painLevel,
        mobilityScore: dto.mobilityScore ?? null,
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
        recordedOn: parseDateOnly(dto.recordedOn),
      },
      select: recordSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PROGRESS_RECORD,
      entityId: row.id,
      metadata: { progressRecordId: row.id, patientId: row.patientId },
    });
    return row;
  }

  async findAllForPatient(
    tenantId: string,
    query: ListProgressQueryDto,
  ): Promise<ProgressRecordDto[]> {
    return this.prisma.progressRecord.findMany({
      where: {
        tenantId,
        patientId: query.patientId,
        patient: { tenantId },
      },
      orderBy: [{ recordedOn: 'desc' }, { createdAt: 'desc' }],
      take: 200,
      select: recordSelect,
    });
  }

  async findOne(tenantId: string, id: string): Promise<ProgressRecordDto> {
    const row = await this.prisma.progressRecord.findFirst({
      where: { id, tenantId },
      select: recordSelect,
    });
    if (!row) {
      throw new NotFoundException('Progress record not found');
    }
    return row;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateProgressRecordDto,
    ctx: AuditRequestContext,
  ): Promise<ProgressRecordDto> {
    const existing = await this.prisma.progressRecord.findFirst({
      where: { id, tenantId },
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

    const row = await this.prisma.progressRecord.update({
      where: { id, tenantId },
      data,
      select: recordSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PROGRESS_RECORD,
      entityId: id,
      metadata: { progressRecordId: id, patientId: row.patientId },
    });
    return row;
  }

  async remove(tenantId: string, id: string, ctx: AuditRequestContext): Promise<void> {
    const existing = await this.prisma.progressRecord.findFirst({
      where: { id, tenantId },
      select: { patientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Progress record not found');
    }
    await this.prisma.progressRecord.delete({ where: { id, tenantId } });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PROGRESS_RECORD,
      entityId: id,
      metadata: { progressRecordId: id, patientId: existing.patientId },
    });
  }

  private async ensurePatientExists(
    tenantId: string,
    patientId: string,
  ): Promise<void> {
    const n = await this.prisma.patient.count({ where: { id: patientId, tenantId } });
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
