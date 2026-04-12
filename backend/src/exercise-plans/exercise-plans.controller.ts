import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { RequestUser } from '../auth/strategies/jwt.strategy';
import { CreateExerciseItemDto } from './dto/create-exercise-item.dto';
import { CreateExercisePlanDto } from './dto/create-exercise-plan.dto';
import { ListExercisePlansQueryDto } from './dto/list-exercise-plans-query.dto';
import { UpdateExerciseItemDto } from './dto/update-exercise-item.dto';
import { UpdateExercisePlanDto } from './dto/update-exercise-plan.dto';
import { ExercisePlansService } from './exercise-plans.service';

@Controller('exercise-plans')
@UseGuards(AuthGuard('jwt'))
export class ExercisePlansController {
  constructor(private readonly exercisePlansService: ExercisePlansService) {}

  @Post()
  create(
    @Body() dto: CreateExercisePlanDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.exercisePlansService.create(dto, req.user.userId);
  }

  @Get()
  findAllForPatient(@Query() query: ListExercisePlansQueryDto) {
    return this.exercisePlansService.findAllForPatient(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.exercisePlansService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExercisePlanDto,
  ) {
    return this.exercisePlansService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.exercisePlansService.remove(id);
  }

  @Post(':id/items')
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExerciseItemDto,
  ) {
    return this.exercisePlansService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateExerciseItemDto,
  ) {
    return this.exercisePlansService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    await this.exercisePlansService.removeItem(id, itemId);
  }
}
