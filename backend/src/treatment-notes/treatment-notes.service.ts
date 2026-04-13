import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { AuditRequestContext } from '../audit/audit-request.util';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTreatmentNoteDto } from './dto/create-treatment-note.dto';
import { ListTreatmentNotesQueryDto } from './dto/list-treatment-notes-query.dto';
import { UpdateTreatmentNoteDto } from './dto/update-treatment-note.dto';

const noteSelect = {
  id: true,
  patientId: true,
  authorUserId: true,
  appointmentId: true,
  subjective: true,
  objective: true,
  assessment: true,
  plan: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: { id: true, firstName: true, lastName: true },
  },
  author: {
    select: { id: true, displayName: true, email: true },
  },
  appointment: {
    select: { id: true, startsAt: true, endsAt: true },
  },
} satisfies Prisma.TreatmentNoteSelect;

export type TreatmentNoteDto = Prisma.TreatmentNoteGetPayload<{
  select: typeof noteSelect;
}>;

@Injectable()
export class TreatmentNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateTreatmentNoteDto,
    authorUserId: string,
    tenantId: string,
    ctx: AuditRequestContext,
  ): Promise<TreatmentNoteDto> {
    await this.ensurePatientExists(tenantId, dto.patientId);
    if (dto.appointmentId) {
      await this.ensureAppointmentMatchesPatient(
        tenantId,
        dto.appointmentId,
        dto.patientId,
      );
    }

    const row = await this.prisma.treatmentNote.create({
      data: {
        tenantId,
        patientId: dto.patientId,
        authorUserId,
        appointmentId: dto.appointmentId ?? null,
        subjective: dto.subjective.trim(),
        objective: dto.objective.trim(),
        assessment: dto.assessment.trim(),
        plan: dto.plan.trim(),
      },
      select: noteSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.TREATMENT_NOTE,
      entityId: row.id,
      metadata: { treatmentNoteId: row.id, patientId: row.patientId },
    });
    return row;
  }

  async findAllForPatient(
    tenantId: string,
    query: ListTreatmentNotesQueryDto,
  ): Promise<TreatmentNoteDto[]> {
    const where: Prisma.TreatmentNoteWhereInput = {
      tenantId,
      patientId: query.patientId,
      patient: { tenantId },
    };
    if (query.appointmentId) {
      where.appointmentId = query.appointmentId;
    }

    return this.prisma.treatmentNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: noteSelect,
    });
  }

  async findOne(tenantId: string, id: string): Promise<TreatmentNoteDto> {
    const row = await this.prisma.treatmentNote.findFirst({
      where: { id, tenantId },
      select: noteSelect,
    });
    if (!row) {
      throw new NotFoundException('Treatment note not found');
    }
    return row;
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateTreatmentNoteDto,
    ctx: AuditRequestContext,
  ): Promise<TreatmentNoteDto> {
    const existing = await this.prisma.treatmentNote.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Treatment note not found');
    }

    if (dto.appointmentId !== undefined && dto.appointmentId !== null) {
      await this.ensureAppointmentMatchesPatient(
        tenantId,
        dto.appointmentId,
        existing.patientId,
      );
    }

    const data: Prisma.TreatmentNoteUpdateInput = {};
    if (dto.appointmentId !== undefined) {
      data.appointment =
        dto.appointmentId === null
          ? { disconnect: true }
          : { connect: { id: dto.appointmentId } };
    }
    if (dto.subjective !== undefined) {
      data.subjective = dto.subjective.trim();
    }
    if (dto.objective !== undefined) {
      data.objective = dto.objective.trim();
    }
    if (dto.assessment !== undefined) {
      data.assessment = dto.assessment.trim();
    }
    if (dto.plan !== undefined) {
      data.plan = dto.plan.trim();
    }

    const row = await this.prisma.treatmentNote.update({
      where: { id, tenantId },
      data,
      select: noteSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.TREATMENT_NOTE,
      entityId: id,
      metadata: { treatmentNoteId: id, patientId: row.patientId },
    });
    return row;
  }

  async remove(
    tenantId: string,
    id: string,
    ctx: AuditRequestContext,
  ): Promise<void> {
    const existing = await this.prisma.treatmentNote.findFirst({
      where: { id, tenantId },
      select: { patientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Treatment note not found');
    }
    await this.prisma.treatmentNote.delete({ where: { id, tenantId } });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.TREATMENT_NOTE,
      entityId: id,
      metadata: { treatmentNoteId: id, patientId: existing.patientId },
    });
  }

  private async ensurePatientExists(
    tenantId: string,
    patientId: string,
  ): Promise<void> {
    const n = await this.prisma.patient.count({
      where: { id: patientId, tenantId },
    });
    if (n === 0) {
      throw new NotFoundException('Patient not found');
    }
  }

  private async ensureAppointmentMatchesPatient(
    tenantId: string,
    appointmentId: string,
    patientId: string,
  ): Promise<void> {
    const appt = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }
    if (appt.patientId !== patientId) {
      throw new BadRequestException(
        'Appointment does not belong to this patient',
      );
    }
  }
}
