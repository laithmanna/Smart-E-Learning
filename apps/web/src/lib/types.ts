export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'COORDINATOR'
  | 'TRAINER'
  | 'STUDENT'
  | 'CLIENT';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface MeResponse {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string;
}

export interface Course {
  id: string;
  courseName: string;
  projectName: string | null;
  startDate: string;
  endDate: string;
  description: string | null;
  location: string | null;
  isClosed: boolean;
  trainerId: string | null;
  coordinatorId: string | null;
  clientId: string | null;
  trainer?: { id: string; name: string } | null;
  coordinator?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
  _count?: { classes: number; enrollments: number; exams: number };
}

export interface CourseClass {
  id: string;
  courseId: string;
  topic: string;
  classDate: string;
  startTime: string;
  endTime: string;
  location: string | null;
  meetingLink: string | null;
}

export interface CourseAttachment {
  id: string;
  courseId: string;
  fileName: string;
  filePath: string;
  uploadedAt: string;
}

export interface CourseDetail extends Course {
  classes: CourseClass[];
  attachments: CourseAttachment[];
}

export interface EnrollmentRow {
  courseId: string;
  studentId: string;
  createdAt: string;
  student: {
    id: string;
    name: string;
    user: { id: string; email: string; isActive: boolean };
  };
}

export interface Exam {
  id: string;
  courseId: string;
  examName: string;
  examDate: string;
  totalMarks: number;
  examType: 'MULTIPLE_CHOICE' | 'FREE_TEXT';
  _count?: { questions: number; results: number };
}

export interface Student {
  id: string;
  name: string;
  phone: string | null;
  socialId: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
  enrollmentDate: string;
  user: { id: string; email: string; isActive: boolean };
}

export interface Coordinator {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; isActive: boolean };
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; isActive: boolean };
}

export interface Trainer {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  specialization: string | null;
  about: string | null;
  photoPath: string | null;
  cvPath: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; isActive: boolean };
}
