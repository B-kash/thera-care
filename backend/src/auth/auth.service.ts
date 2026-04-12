import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  /** Placeholder until login and JWT are implemented. */
  getModuleStatus(): { module: string; phase: string } {
    return { module: 'auth', phase: '1-scaffold' };
  }
}
