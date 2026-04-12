import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { AuditRequestContext } from '../audit/audit-request.util';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseItemDto } from './dto/create-exercise-item.dto';
import { CreateExercisePlanDto } from './dto/create-exercise-plan.dto';
import { ListExercisePlansQueryDto } from './dto/list-exercise-plans-query.dto';
import { UpdateExerciseItemDto } from './dto/update-exercise-item.dto';
import { UpdateExercisePlanDto } from './dto/update-exercise-plan.dto';

const patientMini = {
  select: { id: true, firstName: true, lastName: true },
} as const;

const authorMini = {
  select: { id: true, displayName: true, email: true },
} as const;

const itemSelect = {
  id: true,
  exercisePlanId: true,
  name: true,
  instructions: true,
  sets: true,
  reps: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ExerciseItemSelect;

const planListSelect = {
  id: true,
  patientId: true,
  authorUserId: true,
  title: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  patient: patientMini,
  author: authorMini,
  _count: { select: { items: true } },
} satisfies Prisma.ExercisePlanSelect;

const planDetailSelect = {
  id: true,
  patientId: true,
  authorUserId: true,
  title: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  patient: patientMini,
  author: authorMini,
  items: {
    select: itemSelect,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.ExercisePlanSelect;

export type ExercisePlanListDto = Prisma.ExercisePlanGetPayload<{
  select: typeof planListSelect;
}>;

export type ExercisePlanDetailDto = Prisma.ExercisePlanGetPayload<{
  select: typeof planDetailSelect;
}>;

export type ExerciseItemDto = Prisma.ExerciseItemGetPayload<{
  select: typeof itemSelect;
}>;

@Injectable()
export class ExercisePlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateExercisePlanDto,
    authorUserId: string,
    ctx: AuditRequestContext,
  ): Promise<ExercisePlanDetailDto> {
    await this.ensurePatientExists(dto.patientId);

    const row = await this.prisma.exercisePlan.create({
      data: {
        patientId: dto.patientId,
        authorUserId,
        title: dto.title.trim(),
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
      },
      select: planDetailSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.EXERCISE_PLAN,
      entityId: row.id,
      metadata: { exercisePlanId: row.id, patientId: row.patientId },
    });
    return row;
  }

  async findAllForPatient(
    query: ListExercisePlansQueryDto,
  ): Promise<ExercisePlanListDto[]> {
    return this.prisma.exercisePlan.findMany({
      where: { patientId: query.patientId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: planListSelect,
    });
  }

  async findOne(id: string): Promise<ExercisePlanDetailDto> {
    const row = await this.prisma.exercisePlan.findUnique({
      where: { id },
      select: planDetailSelect,
    });
    if (!row) {
      throw new NotFoundException('Exercise plan not found');
    }
    return row;
  }

  async update(
    id: string,
    dto: UpdateExercisePlanDto,
    ctx: AuditRequestContext,
  ): Promise<ExercisePlanDetailDto> {
    const existing = await this.prisma.exercisePlan.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Exercise plan not found');
    }

    const data: Prisma.ExercisePlanUpdateInput = {};
    if (dto.title !== undefined) {
      data.title = dto.title.trim();
    }
    if (dto.notes !== undefined) {
      data.notes =
        dto.notes === null || dto.notes === ''
          ? null
          : String(dto.notes).trim();
    }

    const row = await this.prisma.exercisePlan.update({
      where: { id },
      data,
      select: planDetailSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.EXERCISE_PLAN,
      entityId: id,
      metadata: { exercisePlanId: id, patientId: row.patientId },
    });
    return row;
  }

  async remove(id: string, ctx: AuditRequestContext): Promise<void> {
    const existing = await this.prisma.exercisePlan.findUnique({
      where: { id },
      select: { patientId: true },
    });
    if (!existing) {
      throw new NotFoundException('Exercise plan not found');
    }
    await this.prisma.exercisePlan.delete({ where: { id } });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.EXERCISE_PLAN,
      entityId: id,
      metadata: { exercisePlanId: id, patientId: existing.patientId },
    });
  }

  async addItem(
    planId: string,
    dto: CreateExerciseItemDto,
    ctx: AuditRequestContext,
  ): Promise<ExerciseItemDto> {
    await this.ensurePlanExists(planId);

    const sortOrder =
      dto.sortOrder ??
      (await this.nextItemSortOrder(planId));

    const row = await this.prisma.exerciseItem.create({
      data: {
        exercisePlanId: planId,
        name: dto.name.trim(),
        instructions: dto.instructions?.trim()
          ? dto.instructions.trim()
          : null,
        sets: dto.sets ?? null,
        reps: dto.reps ?? null,
        sortOrder,
      },
      select: itemSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.EXERCISE_ITEM,
      entityId: row.id,
      metadata: {
        exerciseItemId: row.id,
        exercisePlanId: planId,
      },
    });
    return row;
  }

  async updateItem(
    planId: string,
    itemId: string,
    dto: UpdateExerciseItemDto,
    ctx: AuditRequestContext,
  ): Promise<ExerciseItemDto> {
    await this.ensureItemBelongsToPlan(planId, itemId);

    const data: Prisma.ExerciseItemUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.instructions !== undefined) {
      data.instructions =
        dto.instructions === null || dto.instructions === ''
          ? null
          : String(dto.instructions).trim();
    }
    if (dto.sets !== undefined) {
      data.sets = dto.sets;
    }
    if (dto.reps !== undefined) {
      data.reps = dto.reps;
    }
    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    const row = await this.prisma.exerciseItem.update({
      where: { id: itemId },
      data,
      select: itemSelect,
    });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.EXERCISE_ITEM,
      entityId: itemId,
      metadata: { exerciseItemId: itemId, exercisePlanId: planId },
    });
    return row;
  }

  async removeItem(
    planId: string,
    itemId: string,
    ctx: AuditRequestContext,
  ): Promise<void> {
    await this.ensureItemBelongsToPlan(planId, itemId);
    await this.prisma.exerciseItem.delete({ where: { id: itemId } });
    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.DELETE,
      entityType: AuditEntityType.EXERCISE_ITEM,
      entityId: itemId,
      metadata: { exerciseItemId: itemId, exercisePlanId: planId },
    });
  }

  private async ensurePatientExists(patientId: string): Promise<void> {
    const n = await this.prisma.patient.count({ where: { id: patientId } });
    if (n === 0) {
      throw new NotFoundException('Patient not found');
    }
  }

  private async ensurePlanExists(planId: string): Promise<void> {
    const n = await this.prisma.exercisePlan.count({ where: { id: planId } });
    if (n === 0) {
      throw new NotFoundException('Exercise plan not found');
    }
  }

  private async ensureItemBelongsToPlan(
    planId: string,
    itemId: string,
  ): Promise<void> {
    const item = await this.prisma.exerciseItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.exercisePlanId !== planId) {
      throw new NotFoundException('Exercise item not found');
    }
  }

  private async nextItemSortOrder(planId: string): Promise<number> {
    const agg = await this.prisma.exerciseItem.aggregate({
      where: { exercisePlanId: planId },
      _max: { sortOrder: true },
    });
    return (agg._max.sortOrder ?? -1) + 1;
  }
}
