import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCoordinatorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
