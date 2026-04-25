import { Module } from '@nestjs/common';
import { AttendanceReportService } from './attendance-report.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

@Module({
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceReportService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
