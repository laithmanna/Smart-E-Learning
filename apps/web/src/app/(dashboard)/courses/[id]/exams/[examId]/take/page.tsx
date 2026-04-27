'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
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
  mySubmission: {
    submittedAt: string;
    hasAnswers: boolean;
    result: { marksObtained: number } | null;
  } | null;
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
  const t = useT();

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
          {t('common.backToCourse')}
        </Link>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }
  if (!exam) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
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

  // ----- Already taken (loaded from mySubmission) -----
  if (exam.mySubmission && !submitResult) {
    const sub = exam.mySubmission;
    const submittedDate = new Date(sub.submittedAt).toISOString().slice(0, 10);
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
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{exam.examName}</h1>
          <p className="text-sm text-muted-foreground">
            {t('exam.submittedOn').replace('{date}', submittedDate)}
          </p>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              {t('exam.alreadyTaken')}
            </p>
            {sub.result ? (
              <>
                <p className="text-sm uppercase text-muted-foreground">{t('exam.yourScore')}</p>
                <p className="text-5xl font-bold">
                  {sub.result.marksObtained}
                  <span className="text-2xl text-muted-foreground"> / {exam.totalMarks}</span>
                </p>
                <p className="text-2xl">
                  {Math.round((sub.result.marksObtained / exam.totalMarks) * 100)}%
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('exam.awaitingGrading')}
              </p>
            )}
            <Link href={`/courses/${courseId}`}>
              <Button>{t('common.backToCourse')}</Button>
            </Link>
          </CardContent>
        </Card>
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
            {t('common.backToCourse')}
          </Link>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6 text-center">
            {submitResult.autoGraded && submitResult.result ? (
              <>
                <p className="text-sm uppercase text-muted-foreground">{t('exam.yourScore')}</p>
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
                  {t('exam.autoGraded')}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold">{t('exam.submittedShort')}</p>
                <p className="text-sm text-muted-foreground">
                  {submitResult.message ?? t('exam.awaitingGradingShort')}
                </p>
              </>
            )}
            <Link href={`/courses/${courseId}`}>
              <Button>{t('common.backToCourse')}</Button>
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
          {t('common.backToCourse')}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{exam.examName}</h1>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">
              {exam.examType === 'MULTIPLE_CHOICE'
                ? `${t('exam.mcqShort')} — ${t('exam.autoGraded').replace('.', '')}`
                : t('exam.freeTextShort')}
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
                    {t('exam.question')} {i + 1}
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
                    placeholder={t('exam.typeYourAnswer')}
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
              ? `${Object.keys(selected).length} / ${exam.questions.length} ${t('exam.answered')}`
              : `${
                  Object.values(textAnswers).filter((v) => v.trim().length > 0).length
                } / ${exam.questions.length} ${t('exam.answered')}`}
          </p>
          <Button
            onClick={() => void submit()}
            disabled={submitting || !allAnswered}
          >
            {submitting ? t('common.submitting') : t('exam.submitExam')}
          </Button>
        </div>
      </div>
    </div>
  );
}
