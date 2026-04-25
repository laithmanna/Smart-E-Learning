import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  courseName!: string;

  @IsOptional()
  @IsString()
  projectName?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  trainerId?: string;

  @IsOptional()
  @IsString()
  coordinatorId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}
