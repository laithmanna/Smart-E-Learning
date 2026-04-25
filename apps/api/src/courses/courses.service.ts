import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { generateClassesForRange } from './auto-classes.util';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

const courseInclude = {
  trainer: { select: { id: true, name: true } },
  coordinator: { select: { id: true, name: true } },
  client: { select: { id: true, name: true } },
  _count: { select: { classes: true, enrollments: true, exams: true } },
} satisfies Prisma.CourseInclude;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCourseDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const generated = generateClassesForRange(start, end);

    return this.prisma.course.create({
      data: {
        courseName: dto.courseName,
        projectName: dto.projectName,
        startDate: start,
        endDate: end,
        description: dto.description,
        location: dto.location,
        trainerId: dto.trainerId,
        coordinatorId: dto.coordinatorId,
        clientId: dto.clientId,
        classes: { create: generated },
      },
      include: courseInclude,
    });
  }

  async list(user: AuthenticatedUser, closed?: boolean) {
    const where = await this.scopeForUser(user, closed);
    return this.prisma.course.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: courseInclude,
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const where = { ...(await this.scopeForUser(user)), id };
    const course = await this.prisma.course.findFirst({
      where,
      include: {
        ...courseInclude,
        classes: { orderBy: { classDate: 'asc' } },
        attachments: true,
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.ensureExists(id);
    const data: Prisma.CourseUpdateInput = {
      courseName: dto.courseName,
      projectName: dto.projectName,
      description: dto.description,
      location: dto.location,
      trainer: dto.trainerId ? { connect: { id: dto.trainerId } } : undefined,
      coordinator: dto.coordinatorId ? { connect: { id: dto.coordinatorId } } : undefined,
      client: dto.clientId ? { connect: { id: dto.clientId } } : undefined,
    };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.course.update({ where: { id }, data, include: courseInclude });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.course.delete({ where: { id } });
    return { id };
  }

  async setClosed(id: string, isClosed: boolean) {
    await this.ensureExists(id);
    return this.prisma.course.update({
      where: { id },
      data: { isClosed },
      include: courseInclude,
    });
  }

  private async ensureExists(id: string) {
    const c = await this.prisma.course.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Course not found');
    return c;
  }

  /**
   * Returns a `where` filter scoped to the user's role:
   *  - SuperAdmin/Admin/Coordinator → see all
   *  - Trainer → only their courses
   *  - Student → only courses they're enrolled in
   *  - Client → only their organization's courses
   */
  private async scopeForUser(
    user: AuthenticatedUser,
    closed?: boolean,
  ): Promise<Prisma.CourseWhereInput> {
    const base: Prisma.CourseWhereInput = {};
    if (closed !== undefined) base.isClosed = closed;

    switch (user.role) {
      case Role.SUPER_ADMIN:
      case Role.ADMIN:
      case Role.COORDINATOR:
        return base;
      case Role.TRAINER: {
        const t = await this.prisma.trainer.findUnique({
          where: { userId: user.sub },
          select: { id: true },
        });
        return { ...base, trainerId: t?.id ?? '__none__' };
      }
      case Role.STUDENT: {
        const s = await this.prisma.student.findUnique({
          where: { userId: user.sub },
          select: { id: true },
        });
        return {
          ...base,
          enrollments: { some: { studentId: s?.id ?? '__none__' } },
        };
      }
      case Role.CLIENT: {
        const c = await this.prisma.client.findUnique({
          where: { userId: user.sub },
          select: { id: true },
        });
        return { ...base, clientId: c?.id ?? '__none__' };
      }
    }
  }
}
