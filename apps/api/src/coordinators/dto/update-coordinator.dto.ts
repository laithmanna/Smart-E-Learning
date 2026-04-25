import { IsOptional, IsString } from 'class-validator';

export class UpdateCoordinatorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
