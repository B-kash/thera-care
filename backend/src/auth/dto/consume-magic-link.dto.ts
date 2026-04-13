import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConsumeMagicLinkDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token: string;
}
