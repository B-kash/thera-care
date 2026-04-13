import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestEmailDto {
  @IsEmail()
  email: string;

  /** Which clinic (tenant). Defaults to slug `default` when omitted. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  tenantSlug?: string;
}
