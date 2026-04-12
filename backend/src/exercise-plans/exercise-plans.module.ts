import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ExercisePlansController } from './exercise-plans.controller';
import { ExercisePlansService } from './exercise-plans.service';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ExercisePlansController],
  providers: [ExercisePlansService],
})
export class ExercisePlansModule {}
