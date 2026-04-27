'use client';

import { BarChart3, ClipboardCheck, FileBarChart, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/i18n/provider';

export default function ReportsLandingPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const t = useT();

  const CARDS = [
    {
      href: 'reports/full',
      title: t('reports.fullCourse'),
      description: t('reports.fullCourseDesc'),
      icon: FileBarChart,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      href: 'reports/attendance',
      title: t('reports.attendance'),
      description: t('reports.attendanceDesc'),
      icon: ClipboardCheck,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      href: 'reports/exams',
      title: t('reports.examsReport'),
      description: t('reports.examsReportDesc'),
      icon: GraduationCap,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      href: 'reports/evaluation',
      title: t('reports.evaluation'),
      description: t('reports.evaluationDesc'),
      icon: BarChart3,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          {t('common.backToCourse')}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('reports.pickReport')}
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
                  <p className="text-sm text-primary">{t('reports.viewReport')}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
