import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import type { AuditRequestContext } from '../audit/audit-request.util';
import {
  AuditAction,
  AuditEntityType,
  Prisma,
  UserRole,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 10;

const adminListSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserListRowDto = Prisma.UserGetPayload<{
  select: typeof adminListSelect;
}>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listForAdmin(query: ListUsersQueryDto): Promise<UserListRowDto[]> {
    const skip = query.skip ?? 0;
    const take = query.take ?? 50;
    const where: Prisma.UserWhereInput = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.active !== undefined) {
      where.active = query.active;
    }

    return this.prisma.user.findMany({
      where,
      select: adminListSelect,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async create(
    dto: CreateUserDto,
    ctx: AuditRequestContext,
  ): Promise<UserListRowDto> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const row = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.displayName?.trim() || null,
        role: dto.role,
        active: dto.active ?? true,
      },
      select: adminListSelect,
    });

    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.USER,
      entityId: row.id,
      metadata: { email: row.email, role: row.role },
    });
    return row;
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    ctx: AuditRequestContext,
  ): Promise<UserListRowDto> {
    const hasAny =
      dto.displayName !== undefined ||
      dto.role !== undefined ||
      dto.active !== undefined ||
      dto.password !== undefined;
    if (!hasAny) {
      throw new BadRequestException('No fields to update');
    }

    const current = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, active: true },
    });
    if (!current) {
      throw new NotFoundException('User not found');
    }

    await this.assertKeepsAtLeastOneAdmin(id, current, {
      role: dto.role,
      active: dto.active,
    });

    const data: Prisma.UserUpdateInput = {};
    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim() || null;
    }
    if (dto.role !== undefined) {
      data.role = dto.role;
    }
    if (dto.active !== undefined) {
      data.active = dto.active;
    }
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    const row = await this.prisma.user.update({
      where: { id },
      data,
      select: adminListSelect,
    });

    const auditChanges: Record<string, unknown> = {};
    if (dto.displayName !== undefined) {
      auditChanges.displayName = dto.displayName;
    }
    if (dto.role !== undefined) {
      auditChanges.role = dto.role;
    }
    if (dto.active !== undefined) {
      auditChanges.active = dto.active;
    }
    if (dto.password !== undefined) {
      auditChanges.password = 'changed';
    }

    await this.audit.logEvent({
      context: ctx,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.USER,
      entityId: id,
      metadata: { changes: auditChanges },
    });
    return row;
  }

  private async assertKeepsAtLeastOneAdmin(
    targetUserId: string,
    current: { role: UserRole; active: boolean },
    next: { role?: UserRole; active?: boolean },
  ): Promise<void> {
    const nextRole = next.role ?? current.role;
    const nextActive = next.active ?? current.active;
    const wasAdminActive =
      current.role === UserRole.ADMIN && current.active === true;
    const willBeAdminActive =
      nextRole === UserRole.ADMIN && nextActive === true;
    if (wasAdminActive && !willBeAdminActive) {
      const other = await this.prisma.user.count({
        where: {
          role: UserRole.ADMIN,
          active: true,
          id: { not: targetUserId },
        },
      });
      if (other === 0) {
        throw new BadRequestException(
          'Cannot remove the last active administrator',
        );
      }
    }
  }
}
