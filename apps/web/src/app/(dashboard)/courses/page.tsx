'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { Course, Role } from '@/lib/types';
import { CreateCourseDialog } from './_create-course-dialog';

const CAN_CREATE: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'];

export default function CoursesPage() {
  const { user } = useAuth();
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
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {showClosed ? 'Closed (history)' : 'Active courses'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showClosed ? 'outline' : 'default'}
            size="sm"
            onClick={() => setShowClosed(false)}
          >
            Active
          </Button>
          <Button
            variant={showClosed ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowClosed(true)}
          >
            History
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              + New course
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!courses && !error && <p className="text-muted-foreground">Loading…</p>}
      {courses && courses.length === 0 && (
        <p className="text-muted-foreground">No courses to show.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((c) => (
          <Card key={c.id}>
            <CardHeader>
              <CardTitle>{c.courseName}</CardTitle>
              {c.projectName && (
                <p className="text-sm text-muted-foreground">{c.projectName}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Dates:</span>{' '}
                {fmt(c.startDate)} → {fmt(c.endDate)}
              </p>
              {c.trainer && (
                <p>
                  <span className="text-muted-foreground">Trainer:</span> {c.trainer.name}
                </p>
              )}
              {c.client && (
                <p>
                  <span className="text-muted-foreground">Client:</span> {c.client.name}
                </p>
              )}
              {c._count && (
                <p className="text-xs text-muted-foreground">
                  {c._count.classes} classes · {c._count.enrollments} enrolled · {c._count.exams}{' '}
                  exams
                </p>
              )}
            </CardContent>
          </Card>
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
