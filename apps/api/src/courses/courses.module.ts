import { Module } from '@nestjs/common';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

@Module({
  controllers: [CoursesController, AttachmentsController],
  providers: [CoursesService, AttachmentsService],
  exports: [CoursesService, AttachmentsService],
})
export class CoursesModule {}
