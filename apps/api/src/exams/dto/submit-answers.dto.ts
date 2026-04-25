import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AnswerEntry {
  @IsString()
  questionId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  selectedOption?: number;

  @IsOptional()
  @IsString()
  textAnswer?: string;
}

export class SubmitAnswersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnswerEntry)
  answers!: AnswerEntry[];
}
