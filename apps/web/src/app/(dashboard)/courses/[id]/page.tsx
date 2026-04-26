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
  CourseAttachment,
  CourseClass,
  CourseDetail,
  EnrollmentRow,
  Evaluation,
  Exam,
  Role,
} from '@/lib/types';
import { CreateEvaluationDialog } from './_create-evaluation-dialog';
import { CreateExamDialog } from './_create-exam-dialog';
import { EditClassDialog } from './_edit-class-dialog';
import { EditCourseDialog } from './_edit-course-dialog';
import { EnrollStudentsDialog } from './_enroll-students-dialog';
import { TakeAttendanceDialog } from './_take-attendance-dialog';

const CAN_MANAGE: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'];
const CAN_EDIT_CLASS: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER'];

type Tab = 'classes' | 'students' | 'exams' | 'evaluations' | 'attachments';

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [students, setStudents] = useState<EnrollmentRow[] | null>(null);
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
  const [myResults, setMyResults] = useState<
    { examId: string; marksObtained: number; totalMarks: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('classes');

  const [closeBusy, setCloseBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editingClass, setEditingClass] = useState<CourseClass | null>(null);
  const [attendanceClass, setAttendanceClass] = useState<CourseClass | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [examCreateOpen, setExamCreateOpen] = useState(false);
  const [evalCreateOpen, setEvalCreateOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [deletingAttachment, setDeletingAttachment] = useState<
    { id: string; fileName: string } | null
  >(null);
  const [deleteAttachmentBusy, setDeleteAttachmentBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canManage = user && CAN_MANAGE.includes(user.role);
  const canEditClass = user && CAN_EDIT_CLASS.includes(user.role);

  function refreshStudents() {
    if (!id) return;
    api<EnrollmentRow[]>(`/courses/${id}/students`)
      .then(setStudents)
      .catch(() => {});
  }

  async function uploadAttachment(file: File) {
    if (!course) return;
    setUploadBusy(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const created = await api<CourseAttachment>(
        `/courses/${course.id}/attachments`,
        { method: 'POST', body: fd },
      );
      setCourse((prev) =>
        prev ? { ...prev, attachments: [created, ...prev.attachments] } : prev,
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadBusy(false);
    }
  }

  async function confirmDeleteAttachment() {
    if (!deletingAttachment || !course) return;
    setDeleteAttachmentBusy(true);
    try {
      await api(`/attachments/${deletingAttachment.id}`, { method: 'DELETE' });
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              attachments: prev.attachments.filter(
                (a) => a.id !== deletingAttachment.id,
              ),
            }
          : prev,
      );
      setDeletingAttachment(null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteAttachmentBusy(false);
    }
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
    api<Evaluation[]>(`/evaluations?courseId=${id}`)
      .then(setEvaluations)
      .catch(() => {});
  }, [id]);

  // Student-only: fetch own exam results so we can show "Submitted X/Y" inline
  useEffect(() => {
    if (!user || user.role !== 'STUDENT') return;
    api<Array<{
      exam: { id: string; totalMarks: number };
      marksObtained: number;
    }>>('/me/exam-results')
      .then((rows) =>
        setMyResults(
          rows.map((r) => ({
            examId: r.exam.id,
            marksObtained: r.marksObtained,
            totalMarks: r.exam.totalMarks,
          })),
        ),
      )
      .catch(() => {});
  }, [user]);

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
            {!course.isClosed && (
              <Button size="sm" variant="outline" onClick={() => setEditCourseOpen(true)}>
                Edit course
              </Button>
            )}
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
          <TabButton active={tab === 'evaluations'} onClick={() => setTab('evaluations')}>
            Evaluations ({evaluations?.length ?? '…'})
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
          onTakeAttendance={(k) => setAttendanceClass(k)}
        />
      )}
      {tab === 'students' && (
        <StudentsSection
          rows={students}
          canEnroll={!!canManage && !course.isClosed}
          onEnroll={() => setEnrollOpen(true)}
        />
      )}
      {tab === 'exams' && (
        <ExamsSection
          exams={exams}
          courseId={course.id}
          canCreate={!!canEditClass && !course.isClosed}
          isStudent={user?.role === 'STUDENT'}
          myResults={myResults}
          onCreate={() => setExamCreateOpen(true)}
        />
      )}
      {tab === 'evaluations' && (
        <EvaluationsSection
          evaluations={evaluations}
          courseId={course.id}
          canCreate={!!canManage && !course.isClosed}
          isStudent={user?.role === 'STUDENT'}
          onCreate={() => setEvalCreateOpen(true)}
        />
      )}

      {tab === 'attachments' && (
        <AttachmentsSection
          items={course.attachments}
          canManage={!!canEditClass && !course.isClosed}
          uploading={uploadBusy}
          error={uploadError}
          onUpload={(file) => void uploadAttachment(file)}
          onDelete={(a) => setDeletingAttachment({ id: a.id, fileName: a.fileName })}
        />
      )}

      <EditCourseDialog
        open={editCourseOpen}
        course={course}
        onClose={() => setEditCourseOpen(false)}
        onUpdated={(updated) => setCourse(updated)}
      />

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

      <TakeAttendanceDialog
        klass={attendanceClass}
        enrollments={students}
        onClose={() => setAttendanceClass(null)}
        onSaved={() => {
          /* nothing else to refresh on the page */
        }}
      />

      <EnrollStudentsDialog
        open={enrollOpen}
        courseId={course.id}
        enrolledStudentIds={new Set(students?.map((r) => r.studentId) ?? [])}
        onClose={() => setEnrollOpen(false)}
        onSuccess={() => refreshStudents()}
      />

      <CreateExamDialog
        open={examCreateOpen}
        courseId={course.id}
        onClose={() => setExamCreateOpen(false)}
        onCreated={(exam) => {
          setExams((prev) => (prev ? [...prev, { ...exam, _count: { questions: 0, results: 0 } }] : [exam]));
          router.push(`/courses/${course.id}/exams/${exam.id}`);
        }}
      />

      <CreateEvaluationDialog
        open={evalCreateOpen}
        courseId={course.id}
        onClose={() => setEvalCreateOpen(false)}
        onCreated={(ev) => {
          setEvaluations((prev) =>
            prev ? [{ ...ev, _count: { questions: 0 } }, ...prev] : [ev],
          );
          router.push(`/courses/${course.id}/evaluations/${ev.id}`);
        }}
      />

      <Dialog
        open={!!deletingAttachment}
        onClose={() => !deleteAttachmentBusy && setDeletingAttachment(null)}
        title="Delete attachment?"
        description={
          deletingAttachment
            ? `This permanently removes "${deletingAttachment.fileName}" from the server.`
            : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setDeletingAttachment(null)}
            disabled={deleteAttachmentBusy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void confirmDeleteAttachment()}
            disabled={deleteAttachmentBusy}
          >
            {deleteAttachmentBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>

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
  onTakeAttendance,
}: {
  classes: CourseDetail['classes'];
  canEdit: boolean;
  onEdit: (klass: CourseClass) => void;
  onTakeAttendance: (klass: CourseClass) => void;
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
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onTakeAttendance(c)}
                      >
                        Attendance
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEdit(c)}>
                        Edit
                      </Button>
                    </div>
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

function ExamsSection({
  exams,
  courseId,
  canCreate,
  isStudent,
  myResults,
  onCreate,
}: {
  exams: Exam[] | null;
  courseId: string;
  canCreate: boolean;
  isStudent: boolean;
  myResults: { examId: string; marksObtained: number; totalMarks: number }[];
  onCreate: () => void;
}) {
  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onCreate}>
            + New exam
          </Button>
        </div>
      )}
      {!exams && <p className="text-sm text-muted-foreground">Loading…</p>}
      {exams && exams.length === 0 && (
        <p className="text-sm text-muted-foreground">No exams yet.</p>
      )}
      {exams && exams.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Total marks</th>
                {!isStudent && <th className="p-3">Questions</th>}
                {!isStudent && <th className="p-3">Submitted</th>}
                <th className="p-3 text-right">{isStudent ? 'Action' : ''}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {exams.map((e) => {
                const myResult = myResults.find((r) => r.examId === e.id);
                return (
                  <tr
                    key={e.id}
                    className={isStudent ? '' : 'cursor-pointer transition hover:bg-accent'}
                    onClick={() => {
                      if (!isStudent) {
                        window.location.href = `/courses/${courseId}/exams/${e.id}`;
                      }
                    }}
                  >
                    <td className="p-3 font-medium">{e.examName}</td>
                    <td className="p-3">{fmtDate(e.examDate)}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {e.examType === 'MULTIPLE_CHOICE' ? 'MCQ' : 'Free text'}
                      </span>
                    </td>
                    <td className="p-3">{e.totalMarks}</td>
                    {!isStudent && <td className="p-3">{e._count?.questions ?? 0}</td>}
                    {!isStudent && <td className="p-3">{e._count?.results ?? 0}</td>}
                    <td className="p-3 text-right">
                      {isStudent ? (
                        myResult ? (
                          <Link href={`/courses/${courseId}/exams/${e.id}/take`}>
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300">
                              Submitted · {myResult.marksObtained}/{myResult.totalMarks}
                            </span>
                          </Link>
                        ) : (
                          <Link href={`/courses/${courseId}/exams/${e.id}/take`}>
                            <Button size="sm">Start exam</Button>
                          </Link>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">→</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function EvaluationsSection({
  evaluations,
  courseId,
  canCreate,
  isStudent,
  onCreate,
}: {
  evaluations: Evaluation[] | null;
  courseId: string;
  canCreate: boolean;
  isStudent: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onCreate}>
            + New evaluation
          </Button>
        </div>
      )}
      {!evaluations && <p className="text-sm text-muted-foreground">Loading…</p>}
      {evaluations && evaluations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {isStudent ? 'No evaluations available yet.' : 'No evaluations created yet.'}
        </p>
      )}
      {evaluations && evaluations.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                {!isStudent && <th className="p-3">Status</th>}
                <th className="p-3">Questions</th>
                <th className="p-3">Created</th>
                <th className="p-3 text-right">{isStudent ? 'Action' : ''}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {evaluations.map((e) => (
                <tr
                  key={e.id}
                  className={isStudent ? '' : 'cursor-pointer transition hover:bg-accent'}
                  onClick={() => {
                    if (!isStudent) {
                      window.location.href = `/courses/${courseId}/evaluations/${e.id}`;
                    }
                  }}
                >
                  <td className="p-3 font-medium">{e.name}</td>
                  {!isStudent && (
                    <td className="p-3">
                      {e.isPublished ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          Draft
                        </span>
                      )}
                    </td>
                  )}
                  <td className="p-3">{e._count?.questions ?? 0}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(e.createdAt)}</td>
                  <td className="p-3 text-right">
                    {isStudent ? (
                      <Link href={`/courses/${courseId}/evaluations/${e.id}/fill`}>
                        <Button size="sm">Fill evaluation</Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">→</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function AttachmentsSection({
  items,
  canManage,
  uploading,
  error,
  onUpload,
  onDelete,
}: {
  items: CourseDetail['attachments'];
  canManage: boolean;
  uploading: boolean;
  error: string | null;
  onUpload: (file: File) => void;
  onDelete: (a: CourseAttachment) => void;
}) {
  return (
    <div className="space-y-3">
      {canManage && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Upload course material</p>
              <p className="text-xs text-muted-foreground">
                Any file type · max 25 MB · students will see them on the course page.
              </p>
            </div>
            <label className="inline-flex">
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = '';
                }}
              />
              <span
                className={
                  'inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 ' +
                  (uploading ? 'pointer-events-none opacity-50' : '')
                }
              >
                {uploading ? 'Uploading…' : '+ Choose file'}
              </span>
            </label>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments uploaded.</p>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {items.map((a) => {
              const url = uploadUrl(a.filePath);
              return (
                <li key={a.id} className="flex items-center justify-between p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded {fmtDate(a.uploadedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
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
                    {canManage && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete(a)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
