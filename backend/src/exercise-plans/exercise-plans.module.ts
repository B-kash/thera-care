import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExercisePlansController } from './exercise-plans.controller';
import { ExercisePlansService } from './exercise-plans.service';

@Module({
  imports: [AuthModule],
  controllers: [ExercisePlansController],
  providers: [ExercisePlansService],
})
export class ExercisePlansModule {}
