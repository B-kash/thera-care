import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import {
  AuditAction,
  AuditEntityType,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditRequestContext } from './audit-request.util';
import type { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

const IP_MAX = 128;
const UA_MAX = 512;

const auditListSelect = {
  id: true,
  actorUserId: true,
  action: true,
  entityType: true,
  entityId: true,
  metadata: true,
  ip: true,
  userAgent: true,
  createdAt: true,
  actor: {
    select: { email: true, displayName: true },
  },
} satisfies Prisma.AuditLogSelect;

export type AuditLogRowDto = Prisma.AuditLogGetPayload<{
  select: typeof auditListSelect;
}>;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append-only audit row. Swallows DB errors so clinical requests still succeed
   * if audit insert fails (monitor logs in production).
   */
  async logEvent(params: {
    context: AuditRequestContext;
    action: AuditAction;
    entityType: AuditEntityType;
    entityId: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const { context, action, entityType, entityId, metadata } = params;
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: context.actorUserId,
          action,
          entityType,
          entityId,
          metadata:
            metadata === undefined || metadata === null
              ? undefined
              : (metadata as Prisma.InputJsonValue),
          ip: trunc(context.ip, IP_MAX),
          userAgent: trunc(context.userAgent, UA_MAX),
        },
      });
    } catch (err) {
      this.logger.warn(
        `Audit insert failed (${entityType} ${action} ${entityId}): ${String(err)}`,
      );
    }
  }

  async listForAdmin(query: ListAuditLogsQueryDto): Promise<AuditLogRowDto[]> {
    const take = query.take ?? 50;
    const skip = query.skip ?? 0;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.actorUserId) {
      where.actorUserId = query.actorUserId;
    }
    if (query.action) {
      where.action = query.action;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take,
      select: auditListSelect,
    });
  }
}

function trunc(s: string | null, max: number): string | null {
  if (s == null) return null;
  return s.length <= max ? s : s.slice(0, max);
}
