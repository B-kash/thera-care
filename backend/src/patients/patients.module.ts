import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [PatientsController],
  providers: [PatientsService],
})
export class PatientsModule {}
