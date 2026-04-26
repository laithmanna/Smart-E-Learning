'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { EvaluationDetail } from '@/lib/types';

interface MyResponse {
  id: string;
  evaluationQuestionId: string;
  studentId: string;
  rating: string;
}

const RATINGS = ['Excellent', 'Good', 'Average', 'Poor', 'Very poor'] as const;

export default function FillEvaluationPage() {
  const params = useParams<{ id: string; evaluationId: string }>();
  const courseId = params?.id;
  const evaluationId = params?.evaluationId;
  const { user } = useAuth();

  const [evalRec, setEvalRec] = useState<EvaluationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasPrior, setHasPrior] = useState(false);

  useEffect(() => {
    if (!evaluationId) return;
    api<EvaluationDetail>(`/evaluations/${evaluationId}`)
      .then(setEvalRec)
      .catch((e: Error) => setError(e.message));
  }, [evaluationId]);

  // Load this student's prior responses (if any) and pre-fill
  useEffect(() => {
    if (!evaluationId || !user || user.role !== 'STUDENT') return;
    api<MyResponse[]>(`/me/evaluation-responses?evaluationId=${evaluationId}`)
      .then((rows) => {
        if (rows.length > 0) setHasPrior(true);
        const map: Record<string, string> = {};
        for (const r of rows) map[r.evaluationQuestionId] = r.rating;
        setRatings(map);
      })
      .catch(() => {});
  }, [evaluationId, user]);

  async function submit() {
    if (!evalRec) return;
    setSubmitting(true);
    setError(null);
    try {
      const responses = evalRec.questions.map((q) => ({
        questionId: q.id,
        rating: ratings[q.id] ?? '',
      }));
      await api(`/evaluations/${evalRec.id}/responses`, {
        method: 'POST',
        body: { responses },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
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
  if (user && user.role !== 'STUDENT') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Only students fill evaluations.{' '}
          <Link
            href={`/courses/${courseId}/evaluations/${evalRec.id}`}
            className="text-primary underline"
          >
            Open admin view →
          </Link>
        </p>
      </div>
    );
  }

  if (submitted) {
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
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="text-2xl font-semibold">Thanks for your feedback ✓</p>
            <p className="text-sm text-muted-foreground">
              Your responses have been recorded. You can come back and update them
              any time while the evaluation is open.
            </p>
            <Link href={`/courses/${courseId}`}>
              <Button>Back to course</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allAnswered = evalRec.questions.every((q) => ratings[q.id]);

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

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{evalRec.name}</h1>
        <p className="text-sm text-muted-foreground">
          {evalRec.questions.length} question
          {evalRec.questions.length === 1 ? '' : 's'} · pick a rating for each
        </p>
        {hasPrior && (
          <p className="rounded-md bg-muted px-3 py-2 text-sm">
            You&apos;ve already submitted this — your previous answers are loaded.
            Change any of them and submit to update.
          </p>
        )}
      </div>

      <div className="space-y-4">
        {evalRec.questions.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="space-y-3 pt-6">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  Question {i + 1}
                </p>
                <p className="mt-1 font-medium">{q.question}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {RATINGS.map((r) => {
                  const checked = ratings[q.id] === r;
                  return (
                    <label
                      key={r}
                      className={cn(
                        'cursor-pointer rounded-md border p-2 text-center text-sm transition',
                        checked ? 'border-primary bg-primary/5 font-semibold' : 'hover:bg-accent',
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={r}
                        checked={checked}
                        onChange={() =>
                          setRatings((p) => ({ ...p, [q.id]: r }))
                        }
                        className="sr-only"
                      />
                      {r}
                    </label>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="sticky bottom-0 -mx-8 border-t bg-background px-8 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {Object.keys(ratings).length} / {evalRec.questions.length} answered
          </p>
          <Button
            onClick={() => void submit()}
            disabled={submitting || !allAnswered}
          >
            {submitting ? 'Submitting…' : hasPrior ? 'Update responses' : 'Submit evaluation'}
          </Button>
        </div>
      </div>
    </div>
  );
}
