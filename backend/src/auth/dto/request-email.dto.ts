import { IsEmail } from 'class-validator';

export class RequestEmailDto {
  @IsEmail()
  email: string;
}
