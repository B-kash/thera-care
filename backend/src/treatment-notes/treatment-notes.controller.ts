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
    return this.treatmentNotesService.create(dto, req.user.userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findAllForPatient(@Query() query: ListTreatmentNotesQueryDto) {
    return this.treatmentNotesService.findAllForPatient(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST, UserRole.STAFF)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.treatmentNotesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentNoteDto,
  ) {
    return this.treatmentNotesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.THERAPIST)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.treatmentNotesService.remove(id);
  }
}
