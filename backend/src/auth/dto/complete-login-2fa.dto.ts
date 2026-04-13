import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteLogin2faDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  preAuthToken: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code: string;
}
