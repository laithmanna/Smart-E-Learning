import { ExamType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsString, Min } from 'class-validator';

export class CreateExamDto {
  @IsString()
  courseId!: string;

  @IsString()
  examName!: string;

  @IsDateString()
  examDate!: string;

  @IsInt()
  @Min(1)
  totalMarks!: number;

  @IsEnum(ExamType)
  examType!: ExamType;
}
