import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  examName?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  totalMarks?: number;
}
