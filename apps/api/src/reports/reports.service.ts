import { Injectable, NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ----- FULL COURSE REPORT (aggregate) -----
  async fullReport(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        trainer: { select: { name: true } },
        coordinator: { select: { name: true } },
        client: { select: { name: true } },
        enrollments: { select: { studentId: true } },
        classes: { select: { id: true } },
        exams: { select: { id: true, examName: true, totalMarks: true } },
        evaluations: { select: { id: true, name: true, isPublished: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const studentIds = course.enrollments.map((e) => e.studentId);
    const classIds = course.classes.map((c) => c.id);
    const examIds = course.exams.map((e) => e.id);

    const [attendance, examResults, surveyAvg] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { classId: { in: classIds }, studentId: { in: studentIds } },
        select: { studentId: true, present: true },
      }),
      this.prisma.examResult.findMany({
        where: { examId: { in: examIds } },
        include: {
          exam: { select: { id: true, examName: true, totalMarks: true } },
        },
      }),
      this.prisma.survey.aggregate({
        where: { courseId },
        _avg: { rating: true },
        _count: true,
      }),
    ]);

    // Attendance % overall
    const totalMarks = attendance.length;
    const present = attendance.filter((a) => a.present).length;
    const attendancePct = totalMarks ? Math.round((present / totalMarks) * 100) : 0;

    // Exam avg %
    let examAvgPct = 0;
    if (examResults.length > 0) {
      const sum = examResults.reduce(
        (acc, r) => acc + (r.marksObtained / r.exam.totalMarks) * 100,
        0,
      );
      examAvgPct = Math.round(sum / examResults.length);
    }

    // Per-exam stats
    const perExamMap = new Map<
      string,
      { examName: string; totalMarks: number; sum: number; count: number; max: number; min: number }
    >();
    for (const r of examResults) {
      const k = r.exam.id;
      const current = perExamMap.get(k);
      if (!current) {
        perExamMap.set(k, {
          examName: r.exam.examName,
          totalMarks: r.exam.totalMarks,
          sum: r.marksObtained,
          count: 1,
          max: r.marksObtained,
          min: r.marksObtained,
        });
      } else {
        current.sum += r.marksObtained;
        current.count++;
        current.max = Math.max(current.max, r.marksObtained);
        current.min = Math.min(current.min, r.marksObtained);
      }
    }
    const perExam = Array.from(perExamMap.values()).map((v) => ({
      examName: v.examName,
      avgScore: Math.round((v.sum / v.count) * 10) / 10,
      avgPct: Math.round((v.sum / v.count / v.totalMarks) * 100),
      maxScore: v.max,
      minScore: v.min,
      totalMarks: v.totalMarks,
      submissionCount: v.count,
    }));

    return {
      course: {
        id: course.id,
        name: course.courseName,
        projectName: course.projectName,
        startDate: course.startDate,
        endDate: course.endDate,
        isClosed: course.isClosed,
        trainer: course.trainer?.name ?? null,
        coordinator: course.coordinator?.name ?? null,
        client: course.client?.name ?? null,
      },
      counts: {
        students: studentIds.length,
        classes: classIds.length,
        exams: examIds.length,
        evaluationsPublished: course.evaluations.filter((e) => e.isPublished).length,
        evaluationsTotal: course.evaluations.length,
      },
      attendance: {
        totalMarks,
        present,
        absent: totalMarks - present,
        attendancePct,
      },
      exams: {
        totalSubmissions: examResults.length,
        avgScorePct: examAvgPct,
        perExam,
      },
      survey: {
        responseCount: surveyAvg._count,
        averageRating: surveyAvg._avg.rating ?? null,
      },
    };
  }

  // ----- ATTENDANCE REPORT -----
  async attendanceReport(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        classes: { orderBy: { classDate: 'asc' } },
        enrollments: {
          include: {
            student: { include: { user: { select: { email: true } } } },
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

    // Per student: count present/absent + % of total classes
    const totalClasses = course.classes.length;
    const perStudent = course.enrollments
      .map((e) => {
        const recs = attendances.filter((a) => a.studentId === e.studentId);
        const present = recs.filter((a) => a.present).length;
        const absent = recs.filter((a) => !a.present).length;
        const unmarked = totalClasses - recs.length;
        const pct = totalClasses ? Math.round((present / totalClasses) * 100) : 0;
        return {
          studentId: e.studentId,
          name: e.student.name,
          email: e.student.user.email,
          present,
          absent,
          unmarked,
          totalClasses,
          attendancePct: pct,
        };
      })
      .sort((a, b) => b.attendancePct - a.attendancePct);

    // Per class: count present/absent
    const perClass = course.classes.map((c) => {
      const recs = attendances.filter((a) => a.classId === c.id);
      const present = recs.filter((a) => a.present).length;
      const absent = recs.filter((a) => !a.present).length;
      return {
        classId: c.id,
        topic: c.topic,
        date: c.classDate,
        present,
        absent,
        unmarked: studentIds.length - recs.length,
        totalEnrolled: studentIds.length,
      };
    });

    return {
      course: {
        id: course.id,
        name: course.courseName,
      },
      perStudent,
      perClass,
    };
  }

  // ----- EXAMS REPORT -----
  async examsReport(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        exams: {
          include: {
            results: {
              include: {
                student: {
                  select: { id: true, name: true, user: { select: { email: true } } },
                },
              },
              orderBy: { marksObtained: 'desc' },
            },
            _count: { select: { questions: true } },
          },
          orderBy: { examDate: 'asc' },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const exams = course.exams.map((e) => {
      const scores = e.results.map((r) => r.marksObtained);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const max = scores.length ? Math.max(...scores) : 0;
      const min = scores.length ? Math.min(...scores) : 0;
      return {
        id: e.id,
        examName: e.examName,
        examDate: e.examDate,
        examType: e.examType,
        totalMarks: e.totalMarks,
        questionCount: e._count.questions,
        submissionCount: e.results.length,
        avgScore: Math.round(avg * 10) / 10,
        avgPct: Math.round((avg / e.totalMarks) * 100),
        maxScore: max,
        minScore: min,
        results: e.results.map((r) => ({
          studentId: r.student.id,
          studentName: r.student.name,
          email: r.student.user.email,
          marksObtained: r.marksObtained,
          pct: Math.round((r.marksObtained / e.totalMarks) * 100),
        })),
      };
    });

    return {
      course: { id: course.id, name: course.courseName },
      exams,
    };
  }

  // ----- EXAMS REPORT XLSX -----
  async examsReportXlsx(courseId: string): Promise<Buffer> {
    const data = await this.examsReport(courseId);
    const wb = new Workbook();
    wb.creator = 'Smart E-Learning';
    wb.created = new Date();

    // Summary sheet
    const summary = wb.addWorksheet('Summary');
    summary.addRow(['Course', data.course.name]);
    summary.addRow([]);
    summary.addRow([
      'Exam',
      'Date',
      'Type',
      'Total marks',
      'Questions',
      'Submissions',
      'Avg score',
      'Avg %',
      'Max',
      'Min',
    ]).font = { bold: true };
    for (const e of data.exams) {
      summary.addRow([
        e.examName,
        new Date(e.examDate).toISOString().slice(0, 10),
        e.examType === 'MULTIPLE_CHOICE' ? 'MCQ' : 'Free text',
        e.totalMarks,
        e.questionCount,
        e.submissionCount,
        e.avgScore,
        `${e.avgPct}%`,
        e.maxScore,
        e.minScore,
      ]);
    }
    summary.columns.forEach((col) => (col!.width = 18));

    // One sheet per exam with student-level scores
    for (const e of data.exams) {
      const ws = wb.addWorksheet(e.examName.slice(0, 30));
      ws.addRow(['Student', 'Email', 'Marks', 'Total', '%']).font = { bold: true };
      for (const r of e.results) {
        ws.addRow([r.studentName, r.email, r.marksObtained, e.totalMarks, `${r.pct}%`]);
      }
      ws.columns.forEach((col) => (col!.width = 22));
    }

    const arr = await wb.xlsx.writeBuffer();
    return Buffer.from(arr as ArrayBuffer);
  }

  // ----- EVALUATION REPORT XLSX -----
  async evaluationReportXlsx(evaluationId: string): Promise<Buffer> {
    const ev = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        course: { select: { courseName: true } },
        questions: {
          include: {
            responses: {
              include: { student: { select: { name: true, user: { select: { email: true } } } } },
            },
          },
        },
      },
    });
    if (!ev) throw new NotFoundException('Evaluation not found');

    const wb = new Workbook();
    wb.creator = 'Smart E-Learning';

    const ws = wb.addWorksheet('Evaluation');
    ws.addRow(['Course', ev.course.courseName]);
    ws.addRow(['Evaluation', ev.name]);
    ws.addRow(['Status', ev.isPublished ? 'Published' : 'Draft']);
    ws.addRow([]);

    // Header: Student | Email | Q1 | Q2 | ...
    const studentMap = new Map<
      string,
      { name: string; email: string; responses: Record<string, string> }
    >();
    for (const q of ev.questions) {
      for (const r of q.responses) {
        const existing = studentMap.get(r.studentId);
        if (existing) {
          existing.responses[q.id] = r.rating;
        } else {
          studentMap.set(r.studentId, {
            name: r.student.name,
            email: r.student.user.email,
            responses: { [q.id]: r.rating },
          });
        }
      }
    }
    const header = ['Student', 'Email', ...ev.questions.map((q) => q.question)];
    const headerRow = ws.addRow(header);
    headerRow.font = { bold: true };
    headerRow.alignment = { wrapText: true };
    for (const stu of studentMap.values()) {
      ws.addRow([
        stu.name,
        stu.email,
        ...ev.questions.map((q) => stu.responses[q.id] ?? ''),
      ]);
    }
    ws.columns.forEach((col) => (col!.width = 22));

    const arr = await wb.xlsx.writeBuffer();
    return Buffer.from(arr as ArrayBuffer);
  }
}
