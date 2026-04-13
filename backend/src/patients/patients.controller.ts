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
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  create(
    @Body() dto: CreatePatientDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.patientsService.create(
      dto,
      req.user.userId,
      req.user.tenantId,
      auditContextFromRequest(req),
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findAll(
    @Query() query: ListPatientsQueryDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.patientsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.patientsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.patientsService.update(
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
    await this.patientsService.remove(
      req.user.tenantId,
      id,
      auditContextFromRequest(req),
    );
  }
}
