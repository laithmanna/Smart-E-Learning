'use client';

import { BarChart3, ClipboardCheck, FileBarChart, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CARDS = [
  {
    href: 'reports/full',
    title: 'Full course report',
    description: 'Aggregate stats across attendance, exams, evaluations and surveys.',
    icon: FileBarChart,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    href: 'reports/attendance',
    title: 'Attendance report',
    description: 'Per-student and per-class attendance with charts and Excel export.',
    icon: ClipboardCheck,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    href: 'reports/exams',
    title: 'Exams report',
    description: 'Average scores, distribution and per-student results across all exams.',
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    href: 'reports/evaluation',
    title: 'Evaluation report',
    description: 'Per-question rating breakdowns from student evaluations.',
    icon: BarChart3,
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
  },
];

export default function ReportsLandingPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to course
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Pick a report to see charts and download Excel / PDF.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={`/courses/${courseId}/${c.href}`}
              className="block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full cursor-pointer transition hover:border-primary hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${c.bg}`}>
                    <Icon className={`h-6 w-6 ${c.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{c.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.description}
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary">View report →</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
