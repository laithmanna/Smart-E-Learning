import {
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import { AttachmentsService } from './attachments.service';

const ATTACH_DIR = 'uploads/course-attachments';

function safeFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}${ext}`;
}

@Controller()
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Get('courses/:courseId/attachments')
  list(@Param('courseId') courseId: string) {
    return this.attachments.listByCourse(courseId);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('courses/:courseId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, join(process.cwd(), ATTACH_DIR)),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    }),
  )
  upload(
    @Param('courseId') courseId: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
  ) {
    const relative = `${ATTACH_DIR}/${file.filename}`;
    return this.attachments.create(courseId, file.originalname, relative);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Delete('attachments/:id')
  remove(@Param('id') id: string) {
    return this.attachments.remove(id);
  }
}
