import { IsOptional, IsUUID } from 'class-validator';

export class ListTreatmentNotesQueryDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;
}
