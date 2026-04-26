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
