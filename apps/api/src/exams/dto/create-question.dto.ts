import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  questionText!: string;

  @IsOptional()
  @IsString()
  option1?: string;

  @IsOptional()
  @IsString()
  option2?: string;

  @IsOptional()
  @IsString()
  option3?: string;

  @IsOptional()
  @IsString()
  option4?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  correctOption?: number;
}
