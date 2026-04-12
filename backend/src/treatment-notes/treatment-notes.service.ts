import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateTreatmentNoteDto,
    authorUserId: string,
  ): Promise<TreatmentNoteDto> {
    await this.ensurePatientExists(dto.patientId);
    if (dto.appointmentId) {
      await this.ensureAppointmentMatchesPatient(
        dto.appointmentId,
        dto.patientId,
      );
    }

    return this.prisma.treatmentNote.create({
      data: {
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
  }

  async findAllForPatient(
    query: ListTreatmentNotesQueryDto,
  ): Promise<TreatmentNoteDto[]> {
    const where: Prisma.TreatmentNoteWhereInput = {
      patientId: query.patientId,
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

  async findOne(id: string): Promise<TreatmentNoteDto> {
    const row = await this.prisma.treatmentNote.findUnique({
      where: { id },
      select: noteSelect,
    });
    if (!row) {
      throw new NotFoundException('Treatment note not found');
    }
    return row;
  }

  async update(id: string, dto: UpdateTreatmentNoteDto): Promise<TreatmentNoteDto> {
    const existing = await this.prisma.treatmentNote.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Treatment note not found');
    }

    if (dto.appointmentId !== undefined && dto.appointmentId !== null) {
      await this.ensureAppointmentMatchesPatient(
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

    return this.prisma.treatmentNote.update({
      where: { id },
      data,
      select: noteSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const n = await this.prisma.treatmentNote.count({ where: { id } });
    if (n === 0) {
      throw new NotFoundException('Treatment note not found');
    }
    await this.prisma.treatmentNote.delete({ where: { id } });
  }

  private async ensurePatientExists(patientId: string): Promise<void> {
    const n = await this.prisma.patient.count({ where: { id: patientId } });
    if (n === 0) {
      throw new NotFoundException('Patient not found');
    }
  }

  private async ensureAppointmentMatchesPatient(
    appointmentId: string,
    patientId: string,
  ): Promise<void> {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
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
