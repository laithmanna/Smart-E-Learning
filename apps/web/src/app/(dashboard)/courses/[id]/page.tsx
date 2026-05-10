'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import { cn, uploadUrl } from '@/lib/utils';
import type {
  AttachmentCategory,
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
  const t = useT();

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

  async function uploadAttachment(file: File, category: AttachmentCategory) {
    if (!course) return;
    setUploadBusy(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('category', category);
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

  async function uploadStudentCertificate(studentId: string, file: File) {
    if (!course) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const updated = await api<EnrollmentRow>(
        `/enrollments/${course.id}/${studentId}/certificate`,
        { method: 'POST', body: fd },
      );
      setStudents((prev) =>
        prev ? prev.map((r) => (r.studentId === studentId ? updated : r)) : prev,
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  }

  async function deleteStudentCertificate(studentId: string) {
    if (!course) return;
    try {
      const updated = await api<EnrollmentRow>(
        `/enrollments/${course.id}/${studentId}/certificate`,
        { method: 'DELETE' },
      );
      setStudents((prev) =>
        prev ? prev.map((r) => (r.studentId === studentId ? updated : r)) : prev,
      );
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Delete failed');
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
          {t('common.backToCourses')}
        </Link>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!course) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/courses"
          className="text-sm text-muted-foreground hover:underline"
        >
          {t('common.backToCourses')}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{course.courseName}</h1>
            {course.isClosed ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {t('courses.closed')}
              </span>
            ) : (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                {t('common.active')}
              </span>
            )}
          </div>
          {course.projectName && (
            <p className="text-sm text-muted-foreground">{course.projectName}</p>
          )}
        </div>
        <div className="flex gap-2">
          {(canManage || user?.role === 'CLIENT') && (
            <Link href={`/courses/${course.id}/reports`}>
              <Button size="sm" variant="outline">
                {t('courses.reports')}
              </Button>
            </Link>
          )}
          {canManage && !course.isClosed && (
            <Button size="sm" variant="outline" onClick={() => setEditCourseOpen(true)}>
              {t('courses.editCourse')}
            </Button>
          )}
          {canManage && (
            <Button
              variant={course.isClosed ? 'default' : 'outline'}
              size="sm"
              onClick={() => void toggleClosed()}
              disabled={closeBusy}
            >
              {closeBusy ? '…' : course.isClosed ? t('courses.reopenCourse') : t('courses.closeCourse')}
            </Button>
          )}
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteBusy}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <InfoCard label={t('courses.startDate')} value={fmtDate(course.startDate)} />
        <InfoCard label={t('courses.endDate')} value={fmtDate(course.endDate)} />
        <InfoCard label={t('courses.location')} value={course.location ?? '—'} />
        <InfoCard label={t('courses.trainer')} value={course.trainer?.name ?? '—'} />
        <InfoCard label={t('courses.coordinator')} value={course.coordinator?.name ?? '—'} />
        <InfoCard label={t('courses.client')} value={course.client?.name ?? '—'} />
      </div>

      {course.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('common.description')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{course.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="border-b">
        <nav className="flex gap-1">
          <TabButton active={tab === 'classes'} onClick={() => setTab('classes')}>
            {t('tabs.classes')} ({course.classes.length})
          </TabButton>
          <TabButton active={tab === 'students'} onClick={() => setTab('students')}>
            {t('tabs.students')} ({students?.length ?? '…'})
          </TabButton>
          <TabButton active={tab === 'exams'} onClick={() => setTab('exams')}>
            {t('tabs.exams')} ({exams?.length ?? '…'})
          </TabButton>
          <TabButton active={tab === 'evaluations'} onClick={() => setTab('evaluations')}>
            {t('tabs.evaluations')} ({evaluations?.length ?? '…'})
          </TabButton>
          <TabButton active={tab === 'attachments'} onClick={() => setTab('attachments')}>
            {t('tabs.attachments')} ({course.attachments.length})
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
          canManageCert={!!canEditClass}
          onEnroll={() => setEnrollOpen(true)}
          onUploadCert={(studentId, file) =>
            void uploadStudentCertificate(studentId, file)
          }
          onDeleteCert={(studentId) => void deleteStudentCertificate(studentId)}
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
          onUpload={(file, cat) => void uploadAttachment(file, cat)}
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
        title={t('attachments.deleteConfirm')}
        description={
          deletingAttachment
            ? t('attachments.deleteDesc').replace('{name}', deletingAttachment.fileName)
            : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setDeletingAttachment(null)}
            disabled={deleteAttachmentBusy}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void confirmDeleteAttachment()}
            disabled={deleteAttachmentBusy}
          >
            {deleteAttachmentBusy ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => !deleteBusy && setConfirmDelete(false)}
        title={t('courses.deleteCourse')}
        description={t('courses.deleteCourseDesc').replace('{name}', course.courseName)}
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmDelete(false)}
            disabled={deleteBusy}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void deleteCourse()}
            disabled={deleteBusy}
          >
            {deleteBusy ? t('common.deleting') : t('common.delete')}
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
  const t = useT();
  if (classes.length === 0)
    return <p className="text-sm text-muted-foreground">{t('classes.noClasses')}</p>;
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">{t('classes.topic')}</th>
            <th className="p-3">{t('classes.date')}</th>
            <th className="p-3">{t('classes.time')}</th>
            <th className="p-3">{t('classes.location')}</th>
            <th className="p-3">{t('classes.meetingLink')}</th>
            {canEdit && <th className="p-3 text-right">{t('common.actions')}</th>}
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
                      {t('common.join')}
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
                        {t('classes.attendance')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onEdit(c)}>
                        {t('common.edit')}
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
  canManageCert,
  onEnroll,
  onUploadCert,
  onDeleteCert,
}: {
  rows: EnrollmentRow[] | null;
  canEnroll: boolean;
  canManageCert: boolean;
  onEnroll: () => void;
  onUploadCert: (studentId: string, file: File) => void;
  onDeleteCert: (studentId: string) => void;
}) {
  const t = useT();
  const [confirmDelete, setConfirmDelete] = useState<EnrollmentRow | null>(null);

  return (
    <div className="space-y-3">
      {canEnroll && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onEnroll}>
            {t('enroll.title')}
          </Button>
        </div>
      )}
      {!rows && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('attendance.noStudents')}</p>
      )}
      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('common.name')}</th>
                <th className="p-3">{t('common.email')}</th>
                <th className="p-3">{t('common.active')}</th>
                <th className="p-3">{t('common.date')}</th>
                <th className="p-3">{t('attachments.certificateCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const certUrl = r.certificateFilePath ? uploadUrl(r.certificateFilePath) : null;
                return (
                  <tr key={r.studentId}>
                    <td className="p-3 font-medium">{r.student.name}</td>
                    <td className="p-3 text-muted-foreground">{r.student.user.email}</td>
                    <td className="p-3">
                      {r.student.user.isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {t('common.active')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          {t('common.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{fmtDate(r.createdAt)}</td>
                    <td className="p-3">
                      <CertificateCell
                        row={r}
                        certUrl={certUrl}
                        canManage={canManageCert}
                        onUpload={(file) => onUploadCert(r.studentId, file)}
                        onAskDelete={() => setConfirmDelete(r)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title={t('attachments.studentCertDeleteConfirm')}
        description={
          confirmDelete
            ? t('attachments.studentCertDeleteDesc').replace(
                '{name}',
                confirmDelete.student.name,
              )
            : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirmDelete) onDeleteCert(confirmDelete.studentId);
              setConfirmDelete(null);
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function CertificateCell({
  row,
  certUrl,
  canManage,
  onUpload,
  onAskDelete,
}: {
  row: EnrollmentRow;
  certUrl: string | null | undefined;
  canManage: boolean;
  onUpload: (file: File) => void;
  onAskDelete: () => void;
}) {
  const t = useT();
  if (row.certificateFilePath && certUrl) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={certUrl}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline"
          title={row.certificateFileName ?? ''}
        >
          {t('common.download')}
        </a>
        {canManage && (
          <>
            <label className="inline-flex">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                  e.target.value = '';
                }}
              />
              <span className="inline-flex h-7 cursor-pointer items-center rounded-md border border-border px-2 text-xs hover:bg-secondary">
                {t('attachments.studentCertReplace')}
              </span>
            </label>
            <Button size="sm" variant="destructive" onClick={onAskDelete}>
              {t('common.delete')}
            </Button>
          </>
        )}
      </div>
    );
  }
  if (!canManage) {
    return <span className="text-xs text-muted-foreground">{t('attachments.studentCertNone')}</span>;
  }
  return (
    <label className="inline-flex">
      <input
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = '';
        }}
      />
      <span className="inline-flex h-7 cursor-pointer items-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
        {t('attachments.studentCertUpload')}
      </span>
    </label>
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
  const t = useT();
  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onCreate}>
            {t('exam.newExam')}
          </Button>
        </div>
      )}
      {!exams && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {exams && exams.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('exam.noExams')}</p>
      )}
      {exams && exams.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('common.name')}</th>
                <th className="p-3">{t('common.date')}</th>
                <th className="p-3">{t('common.type')}</th>
                <th className="p-3">{t('exam.totalMarks')}</th>
                {!isStudent && <th className="p-3">{t('exam.questions')}</th>}
                {!isStudent && <th className="p-3">{t('exam.submitted')}</th>}
                <th className="p-3 text-right">{isStudent ? t('common.actions') : ''}</th>
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
                        {e.examType === 'MULTIPLE_CHOICE' ? t('exam.mcqShort') : t('exam.freeTextShort')}
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
                              {t('exam.submitted')} · {myResult.marksObtained}/{myResult.totalMarks}
                            </span>
                          </Link>
                        ) : (
                          <Link href={`/courses/${courseId}/exams/${e.id}/take`}>
                            <Button size="sm">{t('exam.startExam')}</Button>
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
  const t = useT();
  return (
    <div className="space-y-3">
      {canCreate && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onCreate}>
            {t('evaluation.newEvaluation')}
          </Button>
        </div>
      )}
      {!evaluations && <p className="text-sm text-muted-foreground">{t('common.loading')}</p>}
      {evaluations && evaluations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {t('evaluation.noResponsesShort')}
        </p>
      )}
      {evaluations && evaluations.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('common.name')}</th>
                {!isStudent && <th className="p-3">{t('common.status')}</th>}
                <th className="p-3">{t('evaluation.questionsTitle')}</th>
                <th className="p-3">{t('template.createdAt')}</th>
                <th className="p-3 text-right">{isStudent ? t('common.actions') : ''}</th>
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
                          {t('evaluation.publishedShort')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          {t('evaluation.draftShort')}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="p-3">{e._count?.questions ?? 0}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(e.createdAt)}</td>
                  <td className="p-3 text-right">
                    {isStudent ? (
                      <Link href={`/courses/${courseId}/evaluations/${e.id}/fill`}>
                        <Button size="sm">{t('evaluation.fillEvaluation')}</Button>
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
  onUpload: (file: File, category: AttachmentCategory) => void;
  onDelete: (a: CourseAttachment) => void;
}) {
  const t = useT();
  const groups: Array<{
    cat: AttachmentCategory;
    title: string;
    description: string;
    uploadCta: string;
  }> = [
    {
      cat: 'MATERIAL',
      title: t('attachments.catMaterial'),
      description: t('attachments.catMaterialDesc'),
      uploadCta: t('attachments.uploadMaterial'),
    },
    {
      cat: 'TOPICS',
      title: t('attachments.catTopics'),
      description: t('attachments.catTopicsDesc'),
      uploadCta: t('attachments.uploadTopics'),
    },
    {
      cat: 'PRESENTATION',
      title: t('attachments.catPresentation'),
      description: t('attachments.catPresentationDesc'),
      uploadCta: t('attachments.uploadPresentation'),
    },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {groups.map((g) => {
        const filtered = items.filter((a) => a.category === g.cat);
        return (
          <Card key={g.cat}>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">{g.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{g.description}</p>
              </div>
              {canManage && (
                <label className="inline-flex">
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(f, g.cat);
                      e.target.value = '';
                    }}
                  />
                  <span
                    className={
                      'inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 ' +
                      (uploading ? 'pointer-events-none opacity-50' : '')
                    }
                  >
                    {uploading ? t('common.uploading') : g.uploadCta}
                  </span>
                </label>
              )}
            </CardHeader>
            <CardContent>
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('attachments.noFile')}</p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((a) => {
                    const url = uploadUrl(a.filePath);
                    return (
                      <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{a.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('attachments.uploadedOn').replace('{date}', fmtDate(a.uploadedAt))}
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
                              {t('common.download')}
                            </a>
                          )}
                          {canManage && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDelete(a)}
                            >
                              {t('common.delete')}
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
