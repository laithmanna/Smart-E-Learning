'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { EvaluationQuestion } from '@/lib/types';

interface Props {
  open: boolean;
  evaluationId: string;
  // null = not editing; defined = create or edit
  question?: EvaluationQuestion | null;
  onClose: () => void;
  onSaved: (q: EvaluationQuestion) => void;
}

export function EvalQuestionDialog({
  open,
  evaluationId,
  question,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!question;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setText(question?.question ?? '');
    setError(null);
  }, [open, question]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Backend has POST /evaluations/:id/questions but no PATCH for evaluation questions.
      // For "edit" mode: delete the old + add a new one (preserves ordering by createdAt fallback).
      let saved: EvaluationQuestion;
      if (isEdit && question) {
        // For now, since there's no PATCH, we'll just inform the user.
        // (Replacing would orphan responses.) Better to keep it append-only.
        throw new Error(
          'Editing existing questions is disabled (would lose response data). Delete and re-add instead.',
        );
      } else {
        saved = await api<EvaluationQuestion>(
          `/evaluations/${evaluationId}/questions`,
          {
            method: 'POST',
            body: { question: text },
          },
        );
      }
      onSaved(saved);
      setText('');
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
        isEdit
          ? 'Modifying existing questions is disabled to preserve response data.'
          : 'Each student gives a rating per question.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="evalQ">Question *</Label>
          <Textarea
            id="evalQ"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            required
            disabled={isEdit}
            placeholder="e.g. How well did the trainer explain the material?"
          />
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {!isEdit && (
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add question'}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
