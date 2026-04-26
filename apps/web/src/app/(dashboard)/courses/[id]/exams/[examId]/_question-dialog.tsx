'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ExamType, Question } from '@/lib/types';

interface Props {
  open: boolean;
  examId: string;
  examType: ExamType;
  question?: Question | null; // null = create mode, set = edit mode
  onClose: () => void;
  onSaved: (q: Question) => void;
}

export function QuestionDialog({
  open,
  examId,
  examType,
  question,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!question;
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (question) {
      setQuestionText(question.questionText);
      setOptions([
        question.option1 ?? '',
        question.option2 ?? '',
        question.option3 ?? '',
        question.option4 ?? '',
      ]);
      setCorrectOption(question.correctOption ?? 1);
    } else {
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectOption(1);
    }
    setError(null);
  }, [question, open]);

  function setOption(i: number, val: string) {
    setOptions((prev) => prev.map((v, idx) => (idx === i ? val : v)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { questionText };
      if (examType === 'MULTIPLE_CHOICE') {
        const filled = options.filter((o) => o.trim().length > 0);
        if (filled.length < 2) {
          throw new Error('Provide at least 2 options for multiple choice');
        }
        body.option1 = options[0] || undefined;
        body.option2 = options[1] || undefined;
        body.option3 = options[2] || undefined;
        body.option4 = options[3] || undefined;
        body.correctOption = correctOption;
        const idx = correctOption - 1;
        if (!options[idx] || !options[idx].trim()) {
          throw new Error('The selected correct option must have text');
        }
      }
      const saved = isEdit
        ? await api<Question>(`/questions/${question.id}`, {
            method: 'PATCH',
            body,
          })
        : await api<Question>(`/exams/${examId}/questions`, {
            method: 'POST',
            body,
          });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      title={isEdit ? 'Edit question' : 'Add question'}
      description={
        examType === 'MULTIPLE_CHOICE'
          ? 'Multiple choice — provide options + correct answer.'
          : 'Free text — students will type their answer.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="questionText">Question *</Label>
          <Textarea
            id="questionText"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            required
            placeholder="Type the question…"
          />
        </div>

        {examType === 'MULTIPLE_CHOICE' && (
          <div className="space-y-3">
            <Label>Options</Label>
            <p className="text-xs text-muted-foreground">
              Tick the radio next to the correct answer. At least 2 options required.
            </p>
            {options.map((opt, i) => {
              const num = i + 1;
              const checked = correctOption === num;
              return (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-2 rounded-md border p-2',
                    checked && 'border-primary bg-primary/5',
                  )}
                >
                  <input
                    type="radio"
                    name="correct"
                    checked={checked}
                    onChange={() => setCorrectOption(num)}
                    className="h-4 w-4"
                  />
                  <span className="w-6 text-sm font-medium text-muted-foreground">
                    {num}.
                  </span>
                  <Input
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                    placeholder={i < 2 ? `Option ${num} (required)` : `Option ${num} (optional)`}
                    className="flex-1"
                  />
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add question'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
