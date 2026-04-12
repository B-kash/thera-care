import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null && 'message' in body) {
        const m = (body as { message?: string | string[] }).message;
        if (m !== undefined) message = m;
      }
      response.status(status).json({
        statusCode: status,
        message,
        path: request.url,
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaKnownError(exception);
      if (mapped) {
        response.status(mapped.status).json({
          statusCode: mapped.status,
          message: mapped.message,
          path: request.url,
        });
        return;
      }
      this.logger.warn(
        `Unhandled Prisma code ${exception.code}: ${exception.message}`,
      );
      status = HttpStatus.BAD_REQUEST;
      message = 'Database request failed';
      response.status(status).json({
        statusCode: status,
        message,
        path: request.url,
      });
      return;
    }

    if (
      exception instanceof Error &&
      exception.constructor.name === 'PrismaClientValidationError'
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data for database operation';
      response.status(status).json({
        statusCode: status,
        message,
        path: request.url,
      });
      return;
    }

    const err = exception instanceof Error ? exception : undefined;
    this.logger.error(
      err?.message ?? 'Unknown error',
      err?.stack ?? String(exception),
    );

    const isProd = process.env.NODE_ENV === 'production';
    response.status(status).json({
      statusCode: status,
      message: isProd ? 'Internal server error' : err?.message ?? message,
      path: request.url,
    });
  }
}

function mapPrismaKnownError(
  err: Prisma.PrismaClientKnownRequestError,
): { status: number; message: string } | null {
  switch (err.code) {
    case 'P2002':
      return {
        status: HttpStatus.CONFLICT,
        message: 'A record with this value already exists',
      };
    case 'P2025':
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found or no longer exists',
      };
    case 'P2003':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Related record is missing or invalid',
      };
    default:
      return null;
  }
}
