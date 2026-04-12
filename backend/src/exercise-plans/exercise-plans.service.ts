import { Injectable } from '@nestjs/common';

@Injectable()
export class ExercisePlansService {
  getScaffoldStatus() {
    return {
      module: 'exercise-plans',
      phase: 'AGENTS-6-pending',
      message: 'Plans and items ship in Phase 6.',
    };
  }
}
