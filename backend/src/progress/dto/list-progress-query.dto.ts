import { IsUUID } from 'class-validator';

export class ListProgressQueryDto {
  @IsUUID()
  patientId: string;
}
