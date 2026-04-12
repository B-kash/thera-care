import { Module } from '@nestjs/common';
import { ExercisePlansController } from './exercise-plans.controller';
import { ExercisePlansService } from './exercise-plans.service';

@Module({
  controllers: [ExercisePlansController],
  providers: [ExercisePlansService],
})
export class ExercisePlansModule {}
