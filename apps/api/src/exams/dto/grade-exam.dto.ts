import { IsInt, Min } from 'class-validator';

export class GradeExamDto {
  @IsInt()
  @Min(0)
  marksObtained!: number;
}
