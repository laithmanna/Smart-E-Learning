/**
 * Mock data seed — idempotent.
 *
 * Adds a realistic mix of active and closed courses so the dashboard
 * and Courses page have something to show. Safe to re-run.
 *
 * Run with:  pnpm db:seed:mocks
 */
import { PrismaClient } from '@prisma/client';
import { generateClassesForRange } from '../src/courses/auto-classes.util';

const prisma = new PrismaClient();

interface MockCourse {
  courseName: string;
  projectName: string;
  startDaysOffset: number;
  endDaysOffset: number;
  location: string;
  description: string;
  isClosed: boolean;
}

const COURSES: MockCourse[] = [
  // ACTIVE
  {
    courseName: 'Network Security Fundamentals',
    projectName: 'NETSEC-2026',
    startDaysOffset: -7,
    endDaysOffset: 21,
    location: 'HQ - Building A',
    description: 'Core network defence: firewalls, IDS/IPS, segmentation, monitoring.',
    isClosed: false,
  },
  {
    courseName: 'Cloud Architecture on AWS',
    projectName: 'CLOUD-AWS',
    startDaysOffset: 0,
    endDaysOffset: 30,
    location: 'Online',
    description: 'EC2, VPC, S3, IAM, RDS — design well-architected workloads on AWS.',
    isClosed: false,
  },
  {
    courseName: 'Python for Data Analysis',
    projectName: 'PY-DATA',
    startDaysOffset: 7,
    endDaysOffset: 35,
    location: 'HQ - Lab 2',
    description: 'pandas, numpy, matplotlib — clean and analyse real datasets.',
    isClosed: false,
  },
  {
    courseName: 'Project Management Basics',
    projectName: 'PM-101',
    startDaysOffset: 14,
    endDaysOffset: 42,
    location: 'Online',
    description: 'Scope, schedule, risk, stakeholders — PMBOK essentials.',
    isClosed: false,
  },
  {
    courseName: 'DevOps with Docker & Kubernetes',
    projectName: 'DEVOPS-K8S',
    startDaysOffset: -3,
    endDaysOffset: 25,
    location: 'HQ - Building B',
    description: 'Containerise, orchestrate, and ship apps with Docker and K8s.',
    isClosed: false,
  },

  // CLOSED (history)
  {
    courseName: 'Introduction to JavaScript',
    projectName: 'JS-BASICS',
    startDaysOffset: -90,
    endDaysOffset: -30,
    location: 'HQ - Building A',
    description: 'ES2020+ syntax, async/await, fetch, modules.',
    isClosed: true,
  },
  {
    courseName: 'Excel Advanced',
    projectName: 'EXCEL-ADV',
    startDaysOffset: -120,
    endDaysOffset: -60,
    location: 'HQ - Lab 1',
    description: 'Pivot tables, Power Query, dashboards.',
    isClosed: true,
  },
  {
    courseName: 'Leadership Skills',
    projectName: 'LEAD-2025',
    startDaysOffset: -180,
    endDaysOffset: -120,
    location: 'Off-site',
    description: 'Communication, delegation, conflict resolution.',
    isClosed: true,
  },
  {
    courseName: 'SQL & Database Design',
    projectName: 'SQL-DBA',
    startDaysOffset: -150,
    endDaysOffset: -90,
    location: 'Online',
    description: 'Normalisation, indexes, joins, performance tuning.',
    isClosed: true,
  },
  {
    courseName: 'Agile / Scrum Workshop',
    projectName: 'AGILE-2025',
    startDaysOffset: -200,
    endDaysOffset: -180,
    location: 'HQ - Building B',
    description: 'Sprint planning, retros, story-pointing, definition of done.',
    isClosed: true,
  },
];

function offsetDate(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const trainer = await prisma.trainer.findFirst();
  const coordinator = await prisma.coordinator.findFirst();
  const client = await prisma.client.findFirst();

  console.log('Seeding mock courses…');
  console.log('  trainer    :', trainer?.name ?? 'none (will leave unassigned)');
  console.log('  coordinator:', coordinator?.name ?? 'none');
  console.log('  client     :', client?.name ?? 'none');
  console.log();

  let created = 0;
  let skipped = 0;

  for (const c of COURSES) {
    const exists = await prisma.course.findFirst({
      where: { courseName: c.courseName, projectName: c.projectName },
    });
    if (exists) {
      console.log(`  ⊘ skip   ${c.courseName} (already exists)`);
      skipped++;
      continue;
    }

    const startDate = offsetDate(c.startDaysOffset);
    const endDate = offsetDate(c.endDaysOffset);
    const classes = generateClassesForRange(startDate, endDate);

    await prisma.course.create({
      data: {
        courseName: c.courseName,
        projectName: c.projectName,
        startDate,
        endDate,
        location: c.location,
        description: c.description,
        isClosed: c.isClosed,
        trainerId: trainer?.id,
        coordinatorId: coordinator?.id,
        clientId: client?.id,
        classes: { create: classes },
      },
    });
    console.log(
      `  ✓ create ${c.courseName.padEnd(36)} ${c.isClosed ? '(closed)' : '(active)'}  · ${classes.length} classes`,
    );
    created++;
  }

  // Enrol all existing students in the first 2 active courses (idempotent)
  const students = await prisma.student.findMany();
  const activeCourses = await prisma.course.findMany({
    where: { isClosed: false, courseName: { in: ['Network Security Fundamentals', 'Cloud Architecture on AWS'] } },
  });
  let enrolledNew = 0;
  for (const course of activeCourses) {
    for (const s of students) {
      const existing = await prisma.enrollment.findUnique({
        where: { courseId_studentId: { courseId: course.id, studentId: s.id } },
      });
      if (existing) continue;
      await prisma.enrollment.create({
        data: { courseId: course.id, studentId: s.id },
      });
      enrolledNew++;
    }
  }

  console.log();
  console.log(`Done. Created ${created}, skipped ${skipped}. Enrolled ${enrolledNew} students.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
