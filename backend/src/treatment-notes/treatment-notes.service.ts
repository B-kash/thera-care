import { Injectable } from '@nestjs/common';

@Injectable()
export class TreatmentNotesService {
  getScaffoldStatus() {
    return {
      module: 'treatment-notes',
      phase: 'AGENTS-5-pending',
      message: 'CRUD and SOAP UI ship in Phase 5.',
    };
  }
}
