import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsString, ValidateNested } from 'class-validator';

export class BulkAttendanceEntry {
  @IsString()
  studentId!: string;

  @IsBoolean()
  present!: boolean;
}

export class BulkAttendanceDto {
  @IsString()
  classId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceEntry)
  entries!: BulkAttendanceEntry[];
}
