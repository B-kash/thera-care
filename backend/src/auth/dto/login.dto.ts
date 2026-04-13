import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;

  /** Which clinic (tenant). Defaults to slug `default` when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantSlug?: string;
}
