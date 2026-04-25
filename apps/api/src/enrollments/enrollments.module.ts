import { Module } from '@nestjs/common';
import { EnrollmentsController } from './enrollments.controller';
import { EnrollmentsService } from './enrollments.service';
import { ExcelImportService } from './excel-import.service';

@Module({
  controllers: [EnrollmentsController],
  providers: [EnrollmentsService, ExcelImportService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
