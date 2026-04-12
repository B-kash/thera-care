import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProgressRecordDto {
  @IsUUID()
  patientId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  painLevel: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  mobilityScore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  notes?: string;

  /** Calendar date (YYYY-MM-DD). */
  @IsDateString()
  recordedOn: string;
}
