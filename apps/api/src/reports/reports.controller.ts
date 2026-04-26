import { Controller, Get, Param, Res } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';

@Controller()
@Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER, Role.CLIENT)
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('courses/:courseId/reports/full')
  full(@Param('courseId') courseId: string) {
    return this.reports.fullReport(courseId);
  }

  @Get('courses/:courseId/reports/attendance')
  attendance(@Param('courseId') courseId: string) {
    return this.reports.attendanceReport(courseId);
  }

  @Get('courses/:courseId/reports/exams')
  exams(@Param('courseId') courseId: string) {
    return this.reports.examsReport(courseId);
  }

  @Get('courses/:courseId/reports/exams.xlsx')
  async examsXlsx(@Param('courseId') courseId: string, @Res() res: Response) {
    const buf = await this.reports.examsReportXlsx(courseId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="exams-${courseId}.xlsx"`,
    );
    res.send(buf);
  }

  @Get('evaluations/:evaluationId/report.xlsx')
  async evalXlsx(
    @Param('evaluationId') evaluationId: string,
    @Res() res: Response,
  ) {
    const buf = await this.reports.evaluationReportXlsx(evaluationId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="evaluation-${evaluationId}.xlsx"`,
    );
    res.send(buf);
  }
}
