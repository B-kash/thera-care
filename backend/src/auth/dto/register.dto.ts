import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  /** Which clinic (tenant). Defaults to slug `default` when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantSlug?: string;
}
