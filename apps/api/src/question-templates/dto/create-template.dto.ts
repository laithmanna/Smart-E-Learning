import { IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AddTemplateQuestionDto {
  @IsString()
  text!: string;

  @IsString()
  type!: string;
}
