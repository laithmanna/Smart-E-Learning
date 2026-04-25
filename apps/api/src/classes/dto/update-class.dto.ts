import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

const TIME_RX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsDateString()
  classDate?: string;

  @IsOptional()
  @Matches(TIME_RX, { message: 'startTime must be HH:mm' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_RX, { message: 'endTime must be HH:mm' })
  endTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;
}
