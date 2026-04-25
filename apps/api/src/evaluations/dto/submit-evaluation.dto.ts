import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';

export class EvaluationResponseEntry {
  @IsString()
  questionId!: string;

  @IsString()
  rating!: string;
}

export class SubmitEvaluationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EvaluationResponseEntry)
  responses!: EvaluationResponseEntry[];
}
