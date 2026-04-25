import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateEvaluationDto {
  @IsString()
  courseId!: string;

  @IsString()
  name!: string;
}

export class UpdateEvaluationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class AddEvaluationQuestionDto {
  @IsString()
  question!: string;
}
