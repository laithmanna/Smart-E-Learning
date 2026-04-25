import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { memoryStorage } from 'multer';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentsService } from './enrollments.service';
import { ExcelImportService } from './excel-import.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@Controller()
export class EnrollmentsController {
  constructor(
    private readonly enrollments: EnrollmentsService,
    private readonly importer: ExcelImportService,
  ) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post('enrollments')
  enroll(@Body() dto: CreateEnrollmentDto) {
    return this.enrollments.enroll(dto.courseId, dto.studentId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Delete('enrollments/:courseId/:studentId')
  @HttpCode(HttpStatus.OK)
  unenroll(@Param('courseId') courseId: string, @Param('studentId') studentId: string) {
    return this.enrollments.unenroll(courseId, studentId);
  }

  @Get('courses/:courseId/students')
  listByCourse(@Param('courseId') courseId: string) {
    return this.enrollments.listByCourse(courseId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Post('courses/:courseId/enrollments/import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const ok =
          file.mimetype === XLSX_MIME ||
          file.originalname.toLowerCase().endsWith('.xlsx');
        cb(ok ? null : new BadRequestException('Only .xlsx files allowed'), ok);
      },
    }),
  )
  import(
    @Param('courseId') courseId: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    return this.importer.importStudents(courseId, file.buffer);
  }
}
