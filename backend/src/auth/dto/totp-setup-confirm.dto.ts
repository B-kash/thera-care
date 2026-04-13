import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export class TotpSetupConfirmDto {
  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.replace(/\s+/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{6,8}$/, {
    message: 'Enter the 6-digit code from your authenticator app',
  })
  code: string;
}
