import { Controller, Get } from '@nestjs/common';
import { ExercisePlansService } from './exercise-plans.service';

@Controller('exercise-plans')
export class ExercisePlansController {
  constructor(private readonly exercisePlansService: ExercisePlansService) {}

  @Get()
  getScaffold() {
    return this.exercisePlansService.getScaffoldStatus();
  }
}
