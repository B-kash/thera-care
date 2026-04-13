import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class Disable2faDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  password: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s+/g, '').toLowerCase() : value,
  )
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  code: string;
}
