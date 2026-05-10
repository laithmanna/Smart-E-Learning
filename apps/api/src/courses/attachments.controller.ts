import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttachmentCategory, Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import {
  UPLOAD_SUBDIRS,
  uploadDbPath,
  uploadDestination,
} from '../common/uploads';
import { AttachmentsService } from './attachments.service';
import { CoursesService } from './courses.service';

function safeFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}${ext}`;
}

@Controller()
export class AttachmentsController {
  constructor(
    private readonly attachments: AttachmentsService,
    private readonly courses: CoursesService,
  ) {}

  @Get('courses/:courseId/attachments')
  list(
    @Param('courseId') courseId: string,
    @Query('category') category?: string,
  ) {
    const cat = category ? this.attachments.parseCategory(category) : undefined;
    return this.attachments.listByCourse(courseId, cat);
  }

  /**
   * Hub view — every attachment of a given category across every course the
   * caller is allowed to see. Returns rows enriched with course + trainer info
   * so the hub list page can render without extra calls.
   */
  @Get('attachments/by-category/:category')
  async listByCategory(
    @Param('category') category: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const cat = this.attachments.parseCategory(category);
    const visible = await this.courses.list(user);
    const ids = visible.map((c) => c.id);
    return this.attachments.listAllByCategory(cat, ids);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Post('courses/:courseId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, uploadDestination(UPLOAD_SUBDIRS.courseAttachments)),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    }),
  )
  upload(
    @Param('courseId') courseId: string,
    @UploadedFile(new ParseFilePipeBuilder().build({ fileIsRequired: true }))
    file: Express.Multer.File,
    @Body('category') categoryRaw?: string,
  ) {
    const relative = uploadDbPath(UPLOAD_SUBDIRS.courseAttachments, file.filename);
    const category = this.attachments.parseCategory(categoryRaw ?? AttachmentCategory.OTHER);
    return this.attachments.create(courseId, file.originalname, relative, category);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER)
  @Delete('attachments/:id')
  remove(@Param('id') id: string) {
    return this.attachments.remove(id);
  }
}
