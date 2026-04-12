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
import { CreateTreatmentNoteDto } from './dto/create-treatment-note.dto';
import { ListTreatmentNotesQueryDto } from './dto/list-treatment-notes-query.dto';
import { UpdateTreatmentNoteDto } from './dto/update-treatment-note.dto';
import { TreatmentNotesService } from './treatment-notes.service';

@Controller('treatment-notes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TreatmentNotesController {
  constructor(private readonly treatmentNotesService: TreatmentNotesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  create(
    @Body() dto: CreateTreatmentNoteDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.treatmentNotesService.create(
      dto,
      req.user.userId,
      req.user.tenantId,
      auditContextFromRequest(req),
    );
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findAllForPatient(
    @Query() query: ListTreatmentNotesQueryDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.treatmentNotesService.findAllForPatient(
      req.user.tenantId,
      query,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.treatmentNotesService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentNoteDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.treatmentNotesService.update(
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
    await this.treatmentNotesService.remove(
      req.user.tenantId,
      id,
      auditContextFromRequest(req),
    );
  }
}
