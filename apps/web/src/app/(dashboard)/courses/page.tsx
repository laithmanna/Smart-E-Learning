'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Course, Role } from '@/lib/types';
import { CreateCourseDialog } from './_create-course-dialog';

const CAN_CREATE: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'];

export default function CoursesPage() {
  const { user } = useAuth();
  const t = useT();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setCourses(null);
    api<Course[]>(`/courses?closed=${showClosed}`)
      .then(setCourses)
      .catch((e: Error) => setError(e.message));
  }, [showClosed]);

  const canCreate = user && CAN_CREATE.includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('courses.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {showClosed ? t('courses.closedDescription') : t('courses.activeDescription')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showClosed ? 'outline' : 'default'}
            size="sm"
            onClick={() => setShowClosed(false)}
          >
            {t('courses.active')}
          </Button>
          <Button
            variant={showClosed ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowClosed(true)}
          >
            {t('courses.history')}
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              {t('courses.newCourse')}
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!courses && !error && <p className="text-muted-foreground">{t('common.loading')}</p>}
      {courses && courses.length === 0 && (
        <p className="text-muted-foreground">{t('courses.noCourses')}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.id}`}
            className="block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full cursor-pointer transition hover:border-primary hover:shadow-md">
              <CardHeader>
                <CardTitle>{c.courseName}</CardTitle>
                {c.projectName && (
                  <p className="text-sm text-muted-foreground">{c.projectName}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">{t('common.date')}:</span>{' '}
                  {fmt(c.startDate)} → {fmt(c.endDate)}
                </p>
                {c.trainer && (
                  <p>
                    <span className="text-muted-foreground">{t('courses.trainer')}:</span>{' '}
                    {c.trainer.name}
                  </p>
                )}
                {c.client && (
                  <p>
                    <span className="text-muted-foreground">{t('courses.client')}:</span>{' '}
                    {c.client.name}
                  </p>
                )}
                {c._count && (
                  <p className="text-xs text-muted-foreground">
                    {c._count.classes} {t('courses.classes')} · {c._count.enrollments}{' '}
                    {t('courses.enrolled')} · {c._count.exams} {t('courses.exams')}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <CreateCourseDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          if (!showClosed) {
            setCourses((prev) => (prev ? [created, ...prev] : [created]));
          }
        }}
      />
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
