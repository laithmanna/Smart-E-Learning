import { Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceReportService {
  constructor(private readonly prisma: PrismaService) {}

  async buildXlsx(courseId: string): Promise<Buffer> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        classes: { orderBy: { classDate: 'asc' } },
        enrollments: {
          include: {
            student: {
              include: { user: { select: { email: true } } },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const classIds = course.classes.map((c) => c.id);
    const studentIds = course.enrollments.map((e) => e.studentId);

    const attendances = await this.prisma.attendance.findMany({
      where: { classId: { in: classIds }, studentId: { in: studentIds } },
    });

    // Build lookup: studentId -> classId -> present
    const byStudent = new Map<string, Map<string, boolean>>();
    for (const a of attendances) {
      let inner = byStudent.get(a.studentId);
      if (!inner) {
        inner = new Map();
        byStudent.set(a.studentId, inner);
      }
      inner.set(a.classId, a.present);
    }

    const wb = new Workbook();
    wb.creator = 'Smart E-Learning';
    wb.created = new Date();
    const ws = wb.addWorksheet('Attendance');

    // Header row
    const dateFmt = (d: Date) => d.toISOString().slice(0, 10);
    const header = [
      'Student Name',
      'Email',
      'Social ID',
      ...course.classes.map((c) => `${c.topic} (${dateFmt(c.classDate)})`),
      'Present',
      'Total Classes',
      'Attendance %',
    ];
    const headerRow = ws.addRow(header);
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center' };

    // Data rows
    const totalClasses = course.classes.length;
    const sortedEnrollments = [...course.enrollments].sort((a, b) =>
      a.student.name.localeCompare(b.student.name),
    );

    for (const enr of sortedEnrollments) {
      const s = enr.student;
      const inner = byStudent.get(s.id) ?? new Map<string, boolean>();
      let present = 0;
      const cells: (string | number)[] = [s.name, s.user.email, s.socialId ?? ''];
      for (const klass of course.classes) {
        const flag = inner.get(klass.id);
        if (flag === true) {
          cells.push('P');
          present++;
        } else if (flag === false) {
          cells.push('A');
        } else {
          cells.push('');
        }
      }
      cells.push(present);
      cells.push(totalClasses);
      cells.push(totalClasses > 0 ? `${Math.round((present / totalClasses) * 100)}%` : '');
      ws.addRow(cells);
    }

    // Column widths
    ws.getColumn(1).width = 28;
    ws.getColumn(2).width = 32;
    ws.getColumn(3).width = 14;
    for (let i = 0; i < course.classes.length; i++) {
      ws.getColumn(4 + i).width = 18;
    }

    const arr = await wb.xlsx.writeBuffer();
    return Buffer.from(arr as ArrayBuffer);
  }
}
