'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ExamType } from '@/lib/types';

interface TakeExam {
  id: string;
  examName: string;
  examDate: string;
  totalMarks: number;
  examType: ExamType;
  questions: {
    id: string;
    questionText: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    option4: string | null;
  }[];
}

interface SubmitResult {
  autoGraded: boolean;
  result?: { marksObtained: number };
  message?: string;
}

export default function TakeExamPage() {
  const params = useParams<{ id: string; examId: string }>();
  const courseId = params?.id;
  const examId = params?.examId;
  const { user } = useAuth();

  const [exam, setExam] = useState<TakeExam | null>(null);
  const [error, setError] = useState<string | null>(null);

  // questionId -> selectedOption (1-4) or textAnswer
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    if (!examId) return;
    api<TakeExam>(`/exams/${examId}/take`)
      .then(setExam)
      .catch((e: Error) => setError(e.message));
  }, [examId]);

  async function submit() {
    if (!exam) return;
    setSubmitting(true);
    setError(null);
    try {
      const answers = exam.questions.map((q) => ({
        questionId: q.id,
        selectedOption:
          exam.examType === 'MULTIPLE_CHOICE' ? selected[q.id] : undefined,
        textAnswer:
          exam.examType === 'FREE_TEXT' ? textAnswers[q.id] || undefined : undefined,
      }));
      const out = await api<SubmitResult>(`/exams/${exam.id}/submit`, {
        method: 'POST',
        body: { answers },
      });
      setSubmitResult(out);
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
  if (!exam) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (user && user.role !== 'STUDENT') {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Only students can take exams.{' '}
          <Link
            href={`/courses/${courseId}/exams/${exam.id}`}
            className="text-primary underline"
          >
            Open admin view →
          </Link>
        </p>
      </div>
    );
  }

  // ----- After submit: show result screen -----
  if (submitResult) {
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
            {submitResult.autoGraded && submitResult.result ? (
              <>
                <p className="text-sm uppercase text-muted-foreground">Your score</p>
                <p className="text-5xl font-bold">
                  {submitResult.result.marksObtained}
                  <span className="text-2xl text-muted-foreground"> / {exam.totalMarks}</span>
                </p>
                <p className="text-2xl">
                  {Math.round(
                    (submitResult.result.marksObtained / exam.totalMarks) * 100,
                  )}
                  %
                </p>
                <p className="text-sm text-muted-foreground">
                  Graded automatically.
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold">Submitted ✓</p>
                <p className="text-sm text-muted-foreground">
                  {submitResult.message ?? 'Your answers were submitted. Awaiting trainer grading.'}
                </p>
              </>
            )}
            <Link href={`/courses/${courseId}`}>
              <Button>Back to course</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----- Take exam form -----
  const allAnswered =
    exam.examType === 'MULTIPLE_CHOICE'
      ? exam.questions.every((q) => selected[q.id] !== undefined)
      : exam.questions.every((q) => (textAnswers[q.id]?.trim() ?? '').length > 0);

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
            <h1 className="text-2xl font-bold">{exam.examName}</h1>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {exam.examType === 'MULTIPLE_CHOICE' ? 'MCQ — auto-graded' : 'Free text'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {exam.questions.length} question{exam.questions.length === 1 ? '' : 's'} ·{' '}
            {exam.totalMarks} marks
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {exam.questions.map((q, i) => {
          const opts = [q.option1, q.option2, q.option3, q.option4];
          return (
            <Card key={q.id}>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">
                    Question {i + 1}
                  </p>
                  <p className="mt-1 font-medium">{q.questionText}</p>
                </div>

                {exam.examType === 'MULTIPLE_CHOICE' ? (
                  <div className="space-y-2">
                    {opts.map((opt, idx) => {
                      if (!opt) return null;
                      const num = idx + 1;
                      const checked = selected[q.id] === num;
                      return (
                        <label
                          key={idx}
                          className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition',
                            checked ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                          )}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={checked}
                            onChange={() =>
                              setSelected((p) => ({ ...p, [q.id]: num }))
                            }
                            className="h-4 w-4"
                          />
                          <span className="font-medium text-muted-foreground">
                            {num}.
                          </span>
                          <span className="flex-1">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <Textarea
                    rows={4}
                    value={textAnswers[q.id] ?? ''}
                    onChange={(e) =>
                      setTextAnswers((p) => ({ ...p, [q.id]: e.target.value }))
                    }
                    placeholder="Type your answer…"
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-8 border-t bg-background px-8 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {exam.examType === 'MULTIPLE_CHOICE'
              ? `${Object.keys(selected).length} / ${exam.questions.length} answered`
              : `${
                  Object.values(textAnswers).filter((v) => v.trim().length > 0).length
                } / ${exam.questions.length} answered`}
          </p>
          <Button
            onClick={() => void submit()}
            disabled={submitting || !allAnswered}
          >
            {submitting ? 'Submitting…' : 'Submit exam'}
          </Button>
        </div>
      </div>
    </div>
  );
}
