import { IsBoolean, IsString } from 'class-validator';

export class MarkAttendanceDto {
  @IsString()
  classId!: string;

  @IsString()
  studentId!: string;

  @IsBoolean()
  present!: boolean;
}
