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
import { CreateProgressRecordDto } from './dto/create-progress-record.dto';
import { ListProgressQueryDto } from './dto/list-progress-query.dto';
import { UpdateProgressRecordDto } from './dto/update-progress-record.dto';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(AuthGuard('jwt'))
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post()
  create(
    @Body() dto: CreateProgressRecordDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    return this.progressService.create(dto, req.user.userId);
  }

  @Get()
  findAllForPatient(@Query() query: ListProgressQueryDto) {
    return this.progressService.findAllForPatient(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.progressService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgressRecordDto,
  ) {
    return this.progressService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.progressService.remove(id);
  }
}
