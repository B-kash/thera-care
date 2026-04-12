import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { AuditRequestContext } from '../audit/audit-request.util';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from '../generated/prisma/client';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreatePatientDto,
    createdByUserId: string,
    ctx: AuditRequestContext,
  ): Promise<PatientDto> {
    const row = await this.prisma.patient.create({
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
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PATIENT,
      entityId: row.id,
      metadata: { patientId: row.id },
    });
    return row;
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

  async update(
    id: string,
    dto: UpdatePatientDto,
    ctx: AuditRequestContext,
  ): Promise<PatientDto> {
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

    const row = await this.prisma.patient.update({
      where: { id },
      data,
      select: patientSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PATIENT,
      entityId: id,
      metadata: { patientId: id },
    });
    return row;
  }

  async remove(id: string, ctx: AuditRequestContext): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.patient.delete({ where: { id } });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.PATIENT,
      entityId: id,
      metadata: { patientId: id },
    });
  }

  private async ensureExists(id: string): Promise<void> {
    const count = await this.prisma.patient.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException('Patient not found');
    }
  }
}
