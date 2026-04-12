import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const appointmentSelect = {
  id: true,
  patientId: true,
  staffUserId: true,
  startsAt: true,
  endsAt: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  patient: {
    select: { id: true, firstName: true, lastName: true },
  },
  staffUser: {
    select: { id: true, displayName: true, email: true },
  },
} satisfies Prisma.AppointmentSelect;

export type AppointmentDto = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateAppointmentDto,
    defaultStaffUserId: string,
  ): Promise<AppointmentDto> {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    this.assertValidRange(startsAt, endsAt);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const staffUserId = dto.staffUserId ?? defaultStaffUserId;
    const staff = await this.prisma.user.findUnique({
      where: { id: staffUserId },
    });
    if (!staff) {
      throw new NotFoundException('Staff user not found');
    }

    await this.assertNoOverlap(dto.patientId, startsAt, endsAt);

    return this.prisma.appointment.create({
      data: {
        patientId: dto.patientId,
        staffUserId,
        startsAt,
        endsAt,
        status: dto.status,
        notes: dto.notes?.trim() || null,
      },
      select: appointmentSelect,
    });
  }

  async findAll(query: ListAppointmentsQueryDto): Promise<AppointmentDto[]> {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;

    const where: Prisma.AppointmentWhereInput = {};

    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.from || query.to) {
      where.startsAt = {};
      if (query.from) {
        where.startsAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.startsAt.lte = new Date(query.to);
      }
    }

    return this.prisma.appointment.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      skip,
      take,
      select: appointmentSelect,
    });
  }

  async findOne(id: string): Promise<AppointmentDto> {
    const row = await this.prisma.appointment.findUnique({
      where: { id },
      select: appointmentSelect,
    });
    if (!row) {
      throw new NotFoundException('Appointment not found');
    }
    return row;
  }

  async update(id: string, dto: UpdateAppointmentDto): Promise<AppointmentDto> {
    const existing = await this.prisma.appointment.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Appointment not found');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : existing.endsAt;
    this.assertValidRange(startsAt, endsAt);

    const patientId = dto.patientId ?? existing.patientId;
    if (dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found');
      }
    }

    if (dto.staffUserId !== undefined && dto.staffUserId !== null) {
      const staff = await this.prisma.user.findUnique({
        where: { id: dto.staffUserId },
      });
      if (!staff) {
        throw new NotFoundException('Staff user not found');
      }
    }

    await this.assertNoOverlap(patientId, startsAt, endsAt, id);

    const data: Prisma.AppointmentUpdateInput = {};
    if (dto.patientId !== undefined) {
      data.patient = { connect: { id: dto.patientId } };
    }
    if (dto.startsAt !== undefined) {
      data.startsAt = startsAt;
    }
    if (dto.endsAt !== undefined) {
      data.endsAt = endsAt;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.staffUserId !== undefined) {
      data.staffUser =
        dto.staffUserId === null
          ? { disconnect: true }
          : { connect: { id: dto.staffUserId } };
    }
    if (dto.notes !== undefined) {
      data.notes =
        dto.notes === null ? null : (dto.notes as string).trim() || null;
    }

    return this.prisma.appointment.update({
      where: { id },
      data,
      select: appointmentSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const n = await this.prisma.appointment.count({ where: { id } });
    if (n === 0) {
      throw new NotFoundException('Appointment not found');
    }
    await this.prisma.appointment.delete({ where: { id } });
  }

  private assertValidRange(startsAt: Date, endsAt: Date): void {
    if (!(endsAt.getTime() > startsAt.getTime())) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
  }

  private async assertNoOverlap(
    patientId: string,
    startsAt: Date,
    endsAt: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const overlap = await this.prisma.appointment.count({
      where: {
        patientId,
        ...(excludeAppointmentId
          ? { id: { not: excludeAppointmentId } }
          : {}),
        AND: [{ startsAt: { lt: endsAt } }, { endsAt: { gt: startsAt } }],
      },
    });
    if (overlap > 0) {
      throw new ConflictException(
        'This time overlaps another appointment for the same patient',
      );
    }
  }
}
