import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateExercisePlanDto,
    authorUserId: string,
  ): Promise<ExercisePlanDetailDto> {
    await this.ensurePatientExists(dto.patientId);

    return this.prisma.exercisePlan.create({
      data: {
        patientId: dto.patientId,
        authorUserId,
        title: dto.title.trim(),
        notes: dto.notes?.trim() ? dto.notes.trim() : null,
      },
      select: planDetailSelect,
    });
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

    return this.prisma.exercisePlan.update({
      where: { id },
      data,
      select: planDetailSelect,
    });
  }

  async remove(id: string): Promise<void> {
    const n = await this.prisma.exercisePlan.count({ where: { id } });
    if (n === 0) {
      throw new NotFoundException('Exercise plan not found');
    }
    await this.prisma.exercisePlan.delete({ where: { id } });
  }

  async addItem(
    planId: string,
    dto: CreateExerciseItemDto,
  ): Promise<ExerciseItemDto> {
    await this.ensurePlanExists(planId);

    const sortOrder =
      dto.sortOrder ??
      (await this.nextItemSortOrder(planId));

    return this.prisma.exerciseItem.create({
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
  }

  async updateItem(
    planId: string,
    itemId: string,
    dto: UpdateExerciseItemDto,
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

    return this.prisma.exerciseItem.update({
      where: { id: itemId },
      data,
      select: itemSelect,
    });
  }

  async removeItem(planId: string, itemId: string): Promise<void> {
    await this.ensureItemBelongsToPlan(planId, itemId);
    await this.prisma.exerciseItem.delete({ where: { id: itemId } });
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
