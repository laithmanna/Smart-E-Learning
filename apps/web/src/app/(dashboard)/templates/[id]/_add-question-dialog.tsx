'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { TemplateQuestion } from '@/lib/types';

interface Props {
  open: boolean;
  templateId: string;
  onClose: () => void;
  onAdded: (q: TemplateQuestion) => void;
}

export function AddTemplateQuestionDialog({
  open,
  templateId,
  onClose,
  onAdded,
}: Props) {
  const t = useT();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setText('');
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api<TemplateQuestion>(
        `/question-templates/${templateId}/questions`,
        {
          method: 'POST',
          body: { text, type: 'text' },
        },
      );
      onAdded(created);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Add failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
      title={t('template.addQuestion').replace('+ ', '')}
      description={t('template.addQuestionDesc')}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tplq-text">{t('template.questionRequired')}</Label>
          <Textarea
            id="tplq-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            required
            placeholder={t('template.addQuestionPlaceholder')}
          />
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={submitting}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.creating') : t('template.addQuestion').replace('+ ', '')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
