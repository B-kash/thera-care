import { Controller, Get } from '@nestjs/common';
import { TreatmentNotesService } from './treatment-notes.service';

@Controller('treatment-notes')
export class TreatmentNotesController {
  constructor(private readonly treatmentNotesService: TreatmentNotesService) {}

  @Get()
  getScaffold() {
    return this.treatmentNotesService.getScaffoldStatus();
  }
}
