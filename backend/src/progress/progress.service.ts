import { Injectable } from '@nestjs/common';

@Injectable()
export class ProgressService {
  getScaffoldStatus() {
    return {
      module: 'progress',
      phase: 'AGENTS-7-pending',
      message: 'Progress records ship in Phase 7.',
    };
  }
}
