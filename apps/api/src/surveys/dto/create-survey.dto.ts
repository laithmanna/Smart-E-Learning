import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSurveyDto {
  @IsString()
  courseId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}
