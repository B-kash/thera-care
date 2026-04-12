import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTreatmentNoteDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  subjective: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  objective: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  assessment: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  plan: string;
}
