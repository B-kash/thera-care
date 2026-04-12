import { Module } from '@nestjs/common';
import { TreatmentNotesController } from './treatment-notes.controller';
import { TreatmentNotesService } from './treatment-notes.service';

@Module({
  controllers: [TreatmentNotesController],
  providers: [TreatmentNotesService],
})
export class TreatmentNotesModule {}
