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
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { CoursesService } from '../courses/courses.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { EnrollmentsService } from './enrollments.service';
import { ExcelImportService } from './excel-import.service';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CERT_DIR = 'uploads/student-certificates';

function safeFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}${ext}`;
}

@Controller()
export class EnrollmentsController {
  constructor(
    private readonly enrollments: EnrollmentsService,
    private readonly importer: ExcelImportService,
    private readonly courses: CoursesService,
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

  /** Upload (or replace) a student's certificate for a specific course. */
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('enrollments/:courseId/:studentId/certificate')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, join(process.cwd(), CERT_DIR)),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadCertificate(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    const relative = `${CERT_DIR}/${file.filename}`;
    return this.enrollments.setCertificate(
      courseId,
      studentId,
      file.originalname,
      relative,
    );
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Delete('enrollments/:courseId/:studentId/certificate')
  @HttpCode(HttpStatus.OK)
  deleteCertificate(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.enrollments.deleteCertificate(courseId, studentId);
  }

  /** Hub view — list every certificate the caller can see across all courses. */
  @Get('enrollments/certificates')
  async listAllCertificates(@CurrentUser() user: AuthenticatedUser) {
    const visible = await this.courses.list(user);
    const ids = visible.map((c) => c.id);
    return this.enrollments.listCertificates(ids);
  }
}
