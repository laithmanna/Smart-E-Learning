'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { ExamDetail, ExamResultRow, Question, Role } from '@/lib/types';
import { QuestionDialog } from './_question-dialog';

const CAN_MANAGE: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER'];

export default function ExamDetailPage() {
  const params = useParams<{ id: string; examId: string }>();
  const courseId = params?.id;
  const examId = params?.examId;
  const router = useRouter();
  const { user } = useAuth();

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [results, setResults] = useState<ExamResultRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Question | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDeleteExam, setConfirmDeleteExam] = useState(false);
  const [deleteExamBusy, setDeleteExamBusy] = useState(false);

  const canManage = user && CAN_MANAGE.includes(user.role);

  useEffect(() => {
    if (!examId) return;
    api<ExamDetail>(`/exams/${examId}`)
      .then(setExam)
      .catch((e: Error) => setError(e.message));
    api<ExamResultRow[]>(`/exams/${examId}/results`)
      .then(setResults)
      .catch(() => {});
  }, [examId]);

  async function deleteQuestion() {
    if (!deleting || !exam) return;
    setDeleteBusy(true);
    try {
      await api(`/questions/${deleting.id}`, { method: 'DELETE' });
      setExam({ ...exam, questions: exam.questions.filter((q) => q.id !== deleting.id) });
      setDeleting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function deleteExam() {
    if (!exam) return;
    setDeleteExamBusy(true);
    try {
      await api(`/exams/${exam.id}`, { method: 'DELETE' });
      router.push(`/courses/${courseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleteExamBusy(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to course
        </Link>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!exam) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to {exam.course.courseName}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{exam.examName}</h1>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {exam.examType === 'MULTIPLE_CHOICE' ? 'MCQ · Auto-graded' : 'Free text · Manual'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Date: {fmt(exam.examDate)} · Total marks: {exam.totalMarks}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              + Add question
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmDeleteExam(true)}
              disabled={deleteExamBusy}
            >
              Delete exam
            </Button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Questions ({exam.questions.length})
        </h2>
        {exam.questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No questions yet.
              {canManage && (
                <>
                  {' '}
                  <button
                    onClick={() => setAddOpen(true)}
                    className="text-primary underline"
                  >
                    Add the first one.
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {exam.questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <p className="text-xs uppercase text-muted-foreground">
                        Question {i + 1}
                      </p>
                      <p className="font-medium">{q.questionText}</p>
                      {exam.examType === 'MULTIPLE_CHOICE' && (
                        <ul className="space-y-1 text-sm">
                          {[q.option1, q.option2, q.option3, q.option4].map((opt, idx) => {
                            if (!opt) return null;
                            const num = idx + 1;
                            const correct = q.correctOption === num;
                            return (
                              <li
                                key={idx}
                                className={
                                  correct
                                    ? 'rounded-md bg-green-50 px-3 py-1.5 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                    : 'px-3 py-1.5 text-muted-foreground'
                                }
                              >
                                <span className="mr-2 font-medium">{num}.</span>
                                {opt}
                                {correct && (
                                  <span className="ml-2 text-xs">✓ correct</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(q)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleting(q)}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {results && results.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Results ({results.length})</h2>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Marks</th>
                  <th className="p-3">%</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-medium">{r.student.name}</td>
                    <td className="p-3 text-muted-foreground">{r.student.user.email}</td>
                    <td className="p-3">
                      {r.marksObtained} / {exam.totalMarks}
                    </td>
                    <td className="p-3">
                      {Math.round((r.marksObtained / exam.totalMarks) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <QuestionDialog
        open={addOpen}
        examId={exam.id}
        examType={exam.examType}
        onClose={() => setAddOpen(false)}
        onSaved={(q) => setExam({ ...exam, questions: [...exam.questions, q] })}
      />

      <QuestionDialog
        open={!!editing}
        examId={exam.id}
        examType={exam.examType}
        question={editing}
        onClose={() => setEditing(null)}
        onSaved={(q) =>
          setExam({
            ...exam,
            questions: exam.questions.map((x) => (x.id === q.id ? q : x)),
          })
        }
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deleteBusy && setDeleting(null)}
        title="Delete question?"
        description={
          deleting ? `"${deleting.questionText.slice(0, 80)}…"` : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void deleteQuestion()} disabled={deleteBusy}>
            {deleteBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmDeleteExam}
        onClose={() => !deleteExamBusy && setConfirmDeleteExam(false)}
        title="Delete exam?"
        description={`This permanently deletes "${exam.examName}" and all its questions, answers, and results.`}
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmDeleteExam(false)}
            disabled={deleteExamBusy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void deleteExam()}
            disabled={deleteExamBusy}
          >
            {deleteExamBusy ? 'Deleting…' : 'Delete exam'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
