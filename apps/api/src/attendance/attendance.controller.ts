import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { AttendanceReportService } from './attendance-report.service';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Controller()
export class AttendanceController {
  constructor(
    private readonly attendance: AttendanceService,
    private readonly report: AttendanceReportService,
  ) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('attendance')
  mark(@Body() dto: MarkAttendanceDto) {
    return this.attendance.mark(dto.classId, dto.studentId, dto.present);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('attendance/bulk')
  bulk(@Body() dto: BulkAttendanceDto) {
    return this.attendance.bulkMark(dto.classId, dto.entries);
  }

  @Get('attendance')
  list(
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.attendance.list({ classId, studentId, courseId });
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Get('courses/:courseId/attendance/report.xlsx')
  async download(@Param('courseId') courseId: string, @Res() res: Response) {
    const buf = await this.report.buildXlsx(courseId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance-${courseId}.xlsx"`,
    );
    res.send(buf);
  }
}
