import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { UserRole } from '../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { auditContextFromRequest } from '../audit/audit-request.util';
import { CreateProgressRecordDto } from './dto/create-progress-record.dto';
import { ListProgressQueryDto } from './dto/list-progress-query.dto';
import { UpdateProgressRecordDto } from './dto/update-progress-record.dto';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  create(
    @Body() dto: CreateProgressRecordDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.progressService.create(
      dto,
      req.user.userId,
      req.user.tenantId,
      auditContextFromRequest(req),
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findAllForPatient(
    @Query() query: ListProgressQueryDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.progressService.findAllForPatient(req.user.tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.progressService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressRecordDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.progressService.update(
      req.user.tenantId,
      id,
      dto,
      auditContextFromRequest(req),
    );
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.progressService.remove(
      req.user.tenantId,
      id,
      auditContextFromRequest(req),
    );
  }
}
