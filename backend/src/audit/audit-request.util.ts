import type { Request } from 'express';
import type { RequestUser } from '../auth/strategies/jwt.strategy';

export type AuditRequestContext = {
  actorUserId: string;
  ip: string | null;
  userAgent: string | null;
};

export function auditContextFromRequest(
  req: Request & { user: RequestUser },
): AuditRequestContext {
  return {
    actorUserId: req.user.userId,
    ip: clientIp(req),
    userAgent: userAgentHeader(req),
  };
}

function clientIp(req: Request): string | null {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0]?.trim() ?? null;
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(',')[0]?.trim() ?? null;
  }
  const ra = req.socket?.remoteAddress;
  return typeof ra === 'string' && ra.length > 0 ? ra : null;
}

function userAgentHeader(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' && ua.length > 0 ? ua : null;
}
