'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type {
  EvaluationDetail,
  EvaluationQuestion,
  EvaluationReport,
  Role,
} from '@/lib/types';
import { EvalQuestionDialog } from './_eval-question-dialog';

const CAN_MANAGE: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'];

export default function EvaluationDetailPage() {
  const params = useParams<{ id: string; evaluationId: string }>();
  const courseId = params?.id;
  const evaluationId = params?.evaluationId;
  const router = useRouter();
  const { user } = useAuth();

  const [evalRec, setEvalRec] = useState<EvaluationDetail | null>(null);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<EvaluationQuestion | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDeleteEval, setConfirmDeleteEval] = useState(false);
  const [deleteEvalBusy, setDeleteEvalBusy] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);

  const canManage = user && CAN_MANAGE.includes(user.role);

  useEffect(() => {
    if (!evaluationId) return;
    api<EvaluationDetail>(`/evaluations/${evaluationId}`)
      .then(setEvalRec)
      .catch((e: Error) => setError(e.message));
  }, [evaluationId]);

  // Fetch report after we know the user can see it
  useEffect(() => {
    if (!evaluationId || !canManage) return;
    api<EvaluationReport>(`/evaluations/${evaluationId}/report`)
      .then(setReport)
      .catch(() => {});
  }, [evaluationId, canManage]);

  async function togglePublish() {
    if (!evalRec) return;
    setPublishBusy(true);
    try {
      const updated = await api<EvaluationDetail>(`/evaluations/${evalRec.id}`, {
        method: 'PATCH',
        body: { isPublished: !evalRec.isPublished },
      });
      setEvalRec({ ...evalRec, ...updated });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setPublishBusy(false);
    }
  }

  async function deleteQuestion() {
    if (!deleting || !evalRec) return;
    setDeleteBusy(true);
    try {
      await api(`/evaluation-questions/${deleting.id}`, { method: 'DELETE' });
      setEvalRec({
        ...evalRec,
        questions: evalRec.questions.filter((q) => q.id !== deleting.id),
      });
      setDeleting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function deleteEvaluation() {
    if (!evalRec) return;
    setDeleteEvalBusy(true);
    try {
      await api(`/evaluations/${evalRec.id}`, { method: 'DELETE' });
      router.push(`/courses/${courseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleteEvalBusy(false);
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

  if (!evalRec) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

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

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{evalRec.name}</h1>
            {evalRec.isPublished ? (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Published — students can fill it
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                Draft — hidden from students
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {evalRec.questions.length} question{evalRec.questions.length === 1 ? '' : 's'}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setAddOpen(true)}>
              + Add question
            </Button>
            <Button
              size="sm"
              variant={evalRec.isPublished ? 'outline' : 'default'}
              onClick={() => void togglePublish()}
              disabled={publishBusy || (!evalRec.isPublished && evalRec.questions.length === 0)}
              title={
                !evalRec.isPublished && evalRec.questions.length === 0
                  ? 'Add at least one question before publishing'
                  : undefined
              }
            >
              {publishBusy ? '…' : evalRec.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmDeleteEval(true)}
              disabled={deleteEvalBusy}
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Questions</h2>
        {evalRec.questions.length === 0 ? (
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
            {evalRec.questions.map((q, i) => (
              <Card key={q.id}>
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div className="flex-1 space-y-1">
                    <p className="text-xs uppercase text-muted-foreground">
                      Question {i + 1}
                    </p>
                    <p className="font-medium">{q.question}</p>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleting(q)}
                    >
                      Delete
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {canManage && report && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Responses</h2>
          {report.questions.every((q) => q.responses.length === 0) ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No responses yet. Students will fill this once it&apos;s published.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {report.questions.map((q) => (
                <Card key={q.id}>
                  <CardContent className="space-y-3 pt-6">
                    <p className="font-medium">{q.question}</p>
                    {q.responses.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No responses yet.</p>
                    ) : (
                      <ul className="divide-y rounded-md border">
                        {q.responses.map((r) => (
                          <li
                            key={r.studentId}
                            className="flex items-center justify-between p-3 text-sm"
                          >
                            <span className="font-medium">{r.studentName}</span>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                              {r.rating}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <EvalQuestionDialog
        open={addOpen}
        evaluationId={evalRec.id}
        onClose={() => setAddOpen(false)}
        onSaved={(q) => setEvalRec({ ...evalRec, questions: [...evalRec.questions, q] })}
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deleteBusy && setDeleting(null)}
        title="Delete question?"
        description={
          deleting
            ? `"${deleting.question.slice(0, 80)}${deleting.question.length > 80 ? '…' : ''}"`
            : ''
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
        open={confirmDeleteEval}
        onClose={() => !deleteEvalBusy && setConfirmDeleteEval(false)}
        title="Delete evaluation?"
        description={`Permanently deletes "${evalRec.name}" with all questions and responses.`}
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmDeleteEval(false)}
            disabled={deleteEvalBusy}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void deleteEvaluation()}
            disabled={deleteEvalBusy}
          >
            {deleteEvalBusy ? 'Deleting…' : 'Delete evaluation'}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
