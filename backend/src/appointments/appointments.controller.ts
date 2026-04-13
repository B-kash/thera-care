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
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('appointments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  create(
    @Body() dto: CreateAppointmentDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.appointmentsService.create(
      dto,
      req.user.userId,
      req.user.tenantId,
      auditContextFromRequest(req),
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findAll(
    @Query() query: ListAppointmentsQueryDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.appointmentsService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.appointmentsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.appointmentsService.update(
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
    await this.appointmentsService.remove(
      req.user.tenantId,
      id,
      auditContextFromRequest(req),
    );
  }
}
