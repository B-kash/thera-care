import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateExercisePlanDto {
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  notes?: string | null;
}
