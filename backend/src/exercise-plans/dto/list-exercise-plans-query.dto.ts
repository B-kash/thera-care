import { IsUUID } from 'class-validator';

export class ListExercisePlansQueryDto {
  @IsUUID()
  patientId: string;
}
