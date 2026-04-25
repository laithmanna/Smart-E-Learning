import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Gender, Role } from '@prisma/client';
import { Workbook } from 'exceljs';
import { PasswordService } from '../common/password.service';
import { PrismaService } from '../prisma/prisma.service';

export interface ImportRow {
  name: string;
  socialId?: string;
  email: string;
  phone?: string;
  gender?: Gender;
}

export interface ImportError {
  row: number;
  email?: string;
  reason: string;
}

export interface ImportSummary {
  totalRows: number;
  imported: number;
  skipped: number;
  errors: ImportError[];
}

const DEFAULT_PASSWORD = 'User@123';

@Injectable()
export class ExcelImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly password: PasswordService,
  ) {}

  async importStudents(courseId: string, fileBuffer: Buffer): Promise<ImportSummary> {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const rows = await this.parseWorkbook(fileBuffer);

    const summary: ImportSummary = {
      totalRows: rows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    const defaultHash = await this.password.hash(DEFAULT_PASSWORD);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;
      const rowNumber = i + 2; // +1 for 0-index, +1 for header
      try {
        await this.applyRow(courseId, row, defaultHash);
        summary.imported++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Unknown error';
        if (reason === 'ALREADY_ENROLLED') {
          summary.skipped++;
        } else {
          summary.errors.push({ row: rowNumber, email: row.email, reason });
        }
      }
    }
    return summary;
  }

  private async applyRow(courseId: string, row: ImportRow, defaultHash: string) {
    if (!row.email) throw new Error('Missing email');
    if (!row.name) throw new Error('Missing name');

    let user = await this.prisma.user.findUnique({
      where: { email: row.email },
      include: { student: true },
    });

    let studentId: string;

    if (!user) {
      const created = await this.prisma.student.create({
        data: {
          name: row.name,
          phone: row.phone,
          socialId: row.socialId,
          gender: row.gender,
          user: {
            create: {
              email: row.email,
              passwordHash: defaultHash,
              role: Role.STUDENT,
            },
          },
        },
      });
      studentId = created.id;
    } else {
      if (user.role !== Role.STUDENT) {
        throw new Error(`Email belongs to a non-student user (${user.role})`);
      }
      if (!user.student) {
        const created = await this.prisma.student.create({
          data: {
            userId: user.id,
            name: row.name,
            phone: row.phone,
            socialId: row.socialId,
            gender: row.gender,
          },
        });
        studentId = created.id;
      } else {
        studentId = user.student.id;
      }
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    if (existing) throw new Error('ALREADY_ENROLLED');

    await this.prisma.enrollment.create({ data: { courseId, studentId } });
  }

  private async parseWorkbook(buffer: Buffer): Promise<ImportRow[]> {
    const wb = new Workbook();
    try {
      await wb.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      throw new BadRequestException('Could not read xlsx file');
    }
    const sheet = wb.worksheets[0];
    if (!sheet) throw new BadRequestException('Workbook has no sheets');

    const headerMap = this.readHeader(sheet.getRow(1));

    const rows: ImportRow[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum === 1) return;
      const get = (key: keyof typeof headerMap): string | undefined => {
        const col = headerMap[key];
        if (!col) return undefined;
        const v = row.getCell(col).value;
        if (v === null || v === undefined) return undefined;
        if (typeof v === 'string') return v.trim() || undefined;
        if (typeof v === 'number') return String(v);
        if (typeof v === 'object' && 'text' in (v as object)) {
          const t = (v as { text: string }).text;
          return t?.trim() || undefined;
        }
        return String(v).trim() || undefined;
      };

      const name = get('name');
      const email = get('email');
      if (!name && !email) return; // empty row

      const genderRaw = get('gender')?.toUpperCase();
      const gender =
        genderRaw === 'MALE' || genderRaw === 'M'
          ? Gender.MALE
          : genderRaw === 'FEMALE' || genderRaw === 'F'
            ? Gender.FEMALE
            : genderRaw
              ? Gender.OTHER
              : undefined;

      rows.push({
        name: name ?? '',
        email: email ?? '',
        socialId: get('socialId'),
        phone: get('phone'),
        gender,
      });
    });
    return rows;
  }

  private readHeader(row: ReturnType<Workbook['worksheets'][number]['getRow']>) {
    const map: { name?: number; email?: number; phone?: number; socialId?: number; gender?: number } = {};
    row.eachCell((cell, colNumber) => {
      const raw = String(cell.value ?? '').trim().toLowerCase();
      if (!raw) return;
      if (raw.includes('name')) map.name = colNumber;
      else if (raw.includes('email')) map.email = colNumber;
      else if (raw.includes('phone')) map.phone = colNumber;
      else if (raw.includes('social') || raw === 'id' || raw.includes('national')) map.socialId = colNumber;
      else if (raw.includes('gender') || raw.includes('sex')) map.gender = colNumber;
    });
    return map;
  }
}
