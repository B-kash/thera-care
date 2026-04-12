import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TreatmentNotesController } from './treatment-notes.controller';
import { TreatmentNotesService } from './treatment-notes.service';

@Module({
  imports: [AuthModule],
  controllers: [TreatmentNotesController],
  providers: [TreatmentNotesService],
})
export class TreatmentNotesModule {}
