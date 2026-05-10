import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  UPLOAD_SUBDIRS,
  uploadDbPath,
  uploadDestination,
} from '../common/uploads';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';
import { TrainersService } from './trainers.service';

function safeFileName(originalName: string): string {
  const ext = extname(originalName).toLowerCase();
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${stamp}${ext}`;
}

@Controller('trainers')
export class TrainersController {
  constructor(private readonly trainers: TrainersService) {}

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTrainerDto) {
    return this.trainers.create(dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR)
  @Get()
  list() {
    return this.trainers.list();
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.COORDINATOR, Role.TRAINER, Role.STUDENT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.trainers.findOne(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTrainerDto) {
    return this.trainers.update(id, dto);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.trainers.remove(id);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, uploadDestination(UPLOAD_SUBDIRS.trainerPhotos)),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        const ok = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.mimetype);
        cb(ok ? null : new BadRequestException('Only PNG/JPEG/WebP allowed'), ok);
      },
    }),
  )
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder().build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const relative = uploadDbPath(UPLOAD_SUBDIRS.trainerPhotos, file.filename);
    return this.trainers.setPhoto(id, relative);
  }

  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post(':id/cv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) =>
          cb(null, uploadDestination(UPLOAD_SUBDIRS.trainerCvs)),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname)),
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const ok = file.mimetype === 'application/pdf';
        cb(ok ? null : new BadRequestException('Only PDF allowed'), ok);
      },
    }),
  )
  uploadCv(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipeBuilder().build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const relative = uploadDbPath(UPLOAD_SUBDIRS.trainerCvs, file.filename);
    return this.trainers.setCv(id, relative);
  }
}
