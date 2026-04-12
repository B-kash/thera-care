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
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { CreateTreatmentNoteDto } from './dto/create-treatment-note.dto';
import { ListTreatmentNotesQueryDto } from './dto/list-treatment-notes-query.dto';
import { UpdateTreatmentNoteDto } from './dto/update-treatment-note.dto';
import { TreatmentNotesService } from './treatment-notes.service';

@Controller('treatment-notes')
@UseGuards(AuthGuard('jwt'))
export class TreatmentNotesController {
  constructor(private readonly treatmentNotesService: TreatmentNotesService) {}

  @Post()
  create(
    @Body() dto: CreateTreatmentNoteDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.treatmentNotesService.create(dto, req.user.userId);
  }

  @Get()
  findAllForPatient(@Query() query: ListTreatmentNotesQueryDto) {
    return this.treatmentNotesService.findAllForPatient(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.treatmentNotesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentNoteDto,
  ) {
    return this.treatmentNotesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.treatmentNotesService.remove(id);
  }
}
