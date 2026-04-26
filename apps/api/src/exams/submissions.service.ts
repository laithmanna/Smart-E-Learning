import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamType, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';
import { AnswerEntry } from './dto/submit-answers.dto';

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the exam + its questions WITHOUT correctOption (safe for students). */
  async getForStudent(examId: string, user: AuthenticatedUser) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            option1: true,
            option2: true,
            option3: true,
            option4: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    let mySubmission: {
      submittedAt: Date;
      hasAnswers: boolean;
      result: { marksObtained: number } | null;
    } | null = null;

    if (user.role === Role.STUDENT) {
      const student = await this.requireStudent(user.sub);
      await this.requireEnrolled(student.id, exam.courseId);

      const [firstAnswer, result] = await Promise.all([
        this.prisma.studentAnswer.findFirst({
          where: { studentId: student.id, question: { examId } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),
        this.prisma.examResult.findUnique({
          where: { examId_studentId: { examId, studentId: student.id } },
          select: { marksObtained: true },
        }),
      ]);

      if (firstAnswer) {
        mySubmission = {
          submittedAt: firstAnswer.createdAt,
          hasAnswers: true,
          result,
        };
      }
    }

    return {
      id: exam.id,
      examName: exam.examName,
      examDate: exam.examDate,
      totalMarks: exam.totalMarks,
      examType: exam.examType,
      questions: exam.questions,
      mySubmission,
    };
  }

  async submit(examId: string, user: AuthenticatedUser, answers: AnswerEntry[]) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    let studentId: string;
    if (user.role === Role.STUDENT) {
      const student = await this.requireStudent(user.sub);
      await this.requireEnrolled(student.id, exam.courseId);
      studentId = student.id;
    } else {
      throw new ForbiddenException('Only students can submit answers');
    }

    const validQuestionIds = new Set(exam.questions.map((q) => q.id));
    for (const a of answers) {
      if (!validQuestionIds.has(a.questionId)) {
        throw new BadRequestException(`Question ${a.questionId} does not belong to this exam`);
      }
    }

    // Block re-submission — students can only take an exam once
    const alreadySubmitted = await this.prisma.studentAnswer.count({
      where: { studentId, question: { examId } },
    });
    if (alreadySubmitted > 0) {
      throw new ConflictException('You have already submitted this exam');
    }

    // Create answers (one-shot)
    await this.prisma.$transaction(
      answers.map((a) =>
        this.prisma.studentAnswer.create({
          data: {
            questionId: a.questionId,
            studentId,
            selectedOption: a.selectedOption,
            textAnswer: a.textAnswer,
          },
        }),
      ),
    );

    if (exam.examType === ExamType.MULTIPLE_CHOICE) {
      const result = await this.autoGrade(exam, studentId);
      return { autoGraded: true, result };
    }

    return { autoGraded: false, message: 'Submitted — awaiting trainer grading' };
  }

  async listSubmissions(examId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');

    const students = await this.prisma.student.findMany({
      where: { studentAnswers: { some: { question: { examId } } } },
      include: {
        user: { select: { email: true } },
        examResults: { where: { examId } },
      },
    });
    return students.map((s) => ({
      studentId: s.id,
      name: s.name,
      email: s.user.email,
      result: s.examResults[0] ?? null,
    }));
  }

  async getStudentSubmission(examId: string, studentId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { orderBy: { id: 'asc' } } },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const answers = await this.prisma.studentAnswer.findMany({
      where: { studentId, question: { examId } },
    });
    const result = await this.prisma.examResult.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });
    const byQ = new Map(answers.map((a) => [a.questionId, a]));
    return {
      examId,
      studentId,
      examType: exam.examType,
      totalMarks: exam.totalMarks,
      questions: exam.questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        correctOption: q.correctOption,
        answer: byQ.get(q.id) ?? null,
      })),
      result,
    };
  }

  async grade(examId: string, studentId: string, marksObtained: number) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');
    if (marksObtained > exam.totalMarks) {
      throw new BadRequestException(`marksObtained cannot exceed totalMarks (${exam.totalMarks})`);
    }
    return this.prisma.examResult.upsert({
      where: { examId_studentId: { examId, studentId } },
      update: { marksObtained },
      create: { examId, studentId, marksObtained },
    });
  }

  async listResults(examId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Exam not found');
    return this.prisma.examResult.findMany({
      where: { examId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { marksObtained: 'desc' },
    });
  }

  async myResults(user: AuthenticatedUser) {
    if (user.role !== Role.STUDENT) throw new ForbiddenException();
    const student = await this.requireStudent(user.sub);
    return this.prisma.examResult.findMany({
      where: { studentId: student.id },
      include: {
        exam: { select: { id: true, examName: true, examDate: true, totalMarks: true } },
      },
      orderBy: { exam: { examDate: 'desc' } },
    });
  }

  private async autoGrade(
    exam: { id: string; totalMarks: number; questions: { id: string; correctOption: number | null }[] },
    studentId: string,
  ) {
    const answers = await this.prisma.studentAnswer.findMany({
      where: { studentId, question: { examId: exam.id } },
    });
    const byQ = new Map(answers.map((a) => [a.questionId, a]));

    let correct = 0;
    let countable = 0;
    for (const q of exam.questions) {
      if (q.correctOption == null) continue;
      countable++;
      const a = byQ.get(q.id);
      if (a && a.selectedOption === q.correctOption) correct++;
    }
    const marksObtained =
      countable > 0 ? Math.round((correct / countable) * exam.totalMarks) : 0;

    return this.prisma.examResult.upsert({
      where: { examId_studentId: { examId: exam.id, studentId } },
      update: { marksObtained },
      create: { examId: exam.id, studentId, marksObtained },
    });
  }

  private async requireStudent(userId: string) {
    const s = await this.prisma.student.findUnique({ where: { userId } });
    if (!s) throw new ForbiddenException('No student profile');
    return s;
  }

  private async requireEnrolled(studentId: string, courseId: string) {
    const e = await this.prisma.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId } },
    });
    if (!e) throw new ForbiddenException('Not enrolled in this course');
  }
}
