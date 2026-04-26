'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { cn, uploadUrl } from '@/lib/utils';
import type {
  CourseClass,
  CourseDetail,
  EnrollmentRow,
  Exam,
  Role,
} from '@/lib/types';
import { EditClassDialog } from './_edit-class-dialog';
import { EnrollStudentsDialog } from './_enroll-students-dialog';

const CAN_MANAGE: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'];
const CAN_EDIT_CLASS: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER'];

type Tab = 'classes' | 'students' | 'exams' | 'attachments';

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [students, setStudents] = useState<EnrollmentRow[] | null>(null);
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('classes');

  const [closeBusy, setCloseBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editingClass, setEditingClass] = useState<CourseClass | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const canManage = user && CAN_MANAGE.includes(user.role);
  const canEditClass = user && CAN_EDIT_CLASS.includes(user.role);

  function refreshStudents() {
    if (!id) return;
    api<EnrollmentRow[]>(`/courses/${id}/students`)
      .then(setStudents)
      .catch(() => {});
  }

  useEffect(() => {
    if (!id) return;
    api<CourseDetail>(`/courses/${id}`)
      .then(setCourse)
      .catch((e: Error) => setError(e.message));
    api<EnrollmentRow[]>(`/courses/${id}/students`)
      .then(setStudents)
      .catch(() => {});
    api<Exam[]>(`/exams?courseId=${id}`)
      .then(setExams)
      .catch(() => {});
  }, [id]);

  async function toggleClosed() {
    if (!course) return;
    setCloseBusy(true);
    try {
      const updated = await api<CourseDetail>(
        `/courses/${course.id}/${course.isClosed ? 'reopen' : 'close'}`,
        { method: 'POST' },
      );
      setCourse((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setCloseBusy(false);
    }
  }

  async function deleteCourse() {
    if (!course) return;
    setDeleteBusy(true);
    try {
      await api(`/courses/${course.id}`, { method: 'DELETE' });
      router.push('/courses');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleteBusy(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/courses" className="text-sm text-muted-foreground hover:underline">
          ← Back to courses
        </Link>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!course) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/courses"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to courses
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{course.courseName}</h1>
            {course.isClosed ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Closed
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Active
              </span>
            )}
          </div>
          {course.projectName && (
            <p className="text-sm text-muted-foreground">{course.projectName}</p>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button
              variant={course.isClosed ? 'default' : 'outline'}
              size="sm"
              onClick={() => void toggleClosed()}
              disabled={closeBusy}
            >
              {closeBusy ? '…' : course.isClosed ? 'Reopen course' : 'Close course'}
            </Button>
            {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                disabled={deleteBusy}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard label="Start date" value={fmtDate(course.startDate)} />
        <InfoCard label="End date" value={fmtDate(course.endDate)} />
        <InfoCard label="Location" value={course.location ?? '—'} />
        <InfoCard label="Trainer" value={course.trainer?.name ?? '—'} />
        <InfoCard label="Coordinator" value={course.coordinator?.name ?? '—'} />
        <InfoCard label="Client" value={course.client?.name ?? '—'} />
      </div>

      {course.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{course.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="border-b">
        <nav className="flex gap-1">
          <TabButton active={tab === 'classes'} onClick={() => setTab('classes')}>
            Classes ({course.classes.length})
          </TabButton>
          <TabButton active={tab === 'students'} onClick={() => setTab('students')}>
            Students ({students?.length ?? '…'})
          </TabButton>
          <TabButton active={tab === 'exams'} onClick={() => setTab('exams')}>
            Exams ({exams?.length ?? '…'})
          </TabButton>
          <TabButton active={tab === 'attachments'} onClick={() => setTab('attachments')}>
            Attachments ({course.attachments.length})
          </TabButton>
        </nav>
      </div>

      {tab === 'classes' && (
        <ClassesTable
          classes={course.classes}
          canEdit={!!canEditClass}
          onEdit={(k) => setEditingClass(k)}
        />
      )}
      {tab === 'students' && (
        <StudentsSection
          rows={students}
          canEnroll={!!canManage && !course.isClosed}
          onEnroll={() => setEnrollOpen(true)}
        />
      )}
      {tab === 'exams' && <ExamsTable exams={exams} />}
      {tab === 'attachments' && <AttachmentsList items={course.attachments} />}

      <EditClassDialog
        klass={editingClass}
        onClose={() => setEditingClass(null)}
        onUpdated={(updated) => {
          setCourse((prev) =>
            prev
              ? {
                  ...prev,
                  classes: prev.classes.map((c) => (c.id === updated.id ? updated : c)),
                }
              : prev,
          );
        }}
      />

      <EnrollStudentsDialog
        open={enrollOpen}
        courseId={course.id}
        enrolledStudentIds={new Set(students?.map((r) => r.studentId) ?? [])}
        onClose={() => setEnrollOpen(false)}
        onSuccess={() => refreshStudents()}
      />

      <Dialog
        open={confirmDelete}
        onClose={() => !deleteBusy && setConfirmDelete(false)}
        title="Delete course?"
        description={`This permanently deletes ${course.courseName} and all related classes, exams, attendance, attachments.`}
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(false)}
            disabled={deleteBusy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void deleteCourse()}
            disabled={deleteBusy}
          >
            {deleteBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'border-b-2 px-4 py-2 text-sm transition-colors',
        active
          ? 'border-primary font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function ClassesTable({
  classes,
  canEdit,
  onEdit,
}: {
  classes: CourseDetail['classes'];
  canEdit: boolean;
  onEdit: (klass: CourseClass) => void;
}) {
  if (classes.length === 0)
    return <p className="text-sm text-muted-foreground">No classes scheduled.</p>;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Topic</th>
            <th className="p-3">Date</th>
            <th className="p-3">Time</th>
            <th className="p-3">Location</th>
            <th className="p-3">Meeting link</th>
            {canEdit && <th className="p-3 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y">
          {classes.map((c, i) => {
            const loc = c.location && c.location !== 'NaN' ? c.location : '—';
            const link = c.meetingLink && c.meetingLink !== 'NaN' ? c.meetingLink : null;
            return (
              <tr key={c.id}>
                <td className="p-3 text-muted-foreground">{i + 1}</td>
                <td className="p-3 font-medium">{c.topic}</td>
                <td className="p-3">{fmtDate(c.classDate)}</td>
                <td className="p-3">
                  {c.startTime} – {c.endTime}
                </td>
                <td className="p-3">{loc}</td>
                <td className="p-3">
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      Join
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                {canEdit && (
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => onEdit(c)}>
                      Edit
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

function StudentsSection({
  rows,
  canEnroll,
  onEnroll,
}: {
  rows: EnrollmentRow[] | null;
  canEnroll: boolean;
  onEnroll: () => void;
}) {
  return (
    <div className="space-y-3">
      {canEnroll && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onEnroll}>
            + Enroll students
          </Button>
        </div>
      )}
      {!rows && <p className="text-sm text-muted-foreground">Loading…</p>}
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
      )}
      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Active</th>
                <th className="p-3">Enrolled</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.studentId}>
                  <td className="p-3 font-medium">{r.student.name}</td>
                  <td className="p-3 text-muted-foreground">{r.student.user.email}</td>
                  <td className="p-3">
                    {r.student.user.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function ExamsTable({ exams }: { exams: Exam[] | null }) {
  if (!exams) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (exams.length === 0)
    return <p className="text-sm text-muted-foreground">No exams created yet.</p>;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Name</th>
            <th className="p-3">Date</th>
            <th className="p-3">Type</th>
            <th className="p-3">Total marks</th>
            <th className="p-3">Questions</th>
            <th className="p-3">Submitted</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {exams.map((e) => (
            <tr key={e.id}>
              <td className="p-3 font-medium">{e.examName}</td>
              <td className="p-3">{fmtDate(e.examDate)}</td>
              <td className="p-3">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                  {e.examType === 'MULTIPLE_CHOICE' ? 'MCQ' : 'Free text'}
                </span>
              </td>
              <td className="p-3">{e.totalMarks}</td>
              <td className="p-3">{e._count?.questions ?? 0}</td>
              <td className="p-3">{e._count?.results ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function AttachmentsList({ items }: { items: CourseDetail['attachments'] }) {
  if (items.length === 0)
    return <p className="text-sm text-muted-foreground">No attachments uploaded.</p>;
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y">
        {items.map((a) => {
          const url = uploadUrl(a.filePath);
          return (
            <li key={a.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <p className="font-medium">{a.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {fmtDate(a.uploadedAt)}
                </p>
              </div>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Download
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
