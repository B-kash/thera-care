import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../generated/prisma/client';

export class CreateUserDto {
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

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
