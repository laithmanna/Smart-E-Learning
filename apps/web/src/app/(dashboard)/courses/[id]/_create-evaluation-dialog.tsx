'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Evaluation, QuestionTemplate } from '@/lib/types';

type Source = 'blank' | 'template';

interface Props {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onCreated: (e: Evaluation) => void;
}

export function CreateEvaluationDialog({ open, courseId, onClose, onCreated }: Props) {
  const t = useT();
  const [name, setName] = useState('');
  const [source, setSource] = useState<Source>('blank');
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    api<QuestionTemplate[]>('/question-templates')
      .then((rows) => {
        setTemplates(rows);
        // pre-select first template if any
        if (rows.length > 0 && rows[0]) setTemplateId(rows[0].id);
      })
      .catch(() => setTemplates([]));
  }, [open]);

  function reset() {
    setName('');
    setSource('blank');
    setTemplateId('');
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      let created: Evaluation;
      if (source === 'template') {
        if (!templateId) throw new Error('Pick a template first');
        created = await api<Evaluation>(
          `/evaluations/from-template/${templateId}`,
          {
            method: 'POST',
            body: { courseId, name },
          },
        );
      } else {
        created = await api<Evaluation>('/evaluations', {
          method: 'POST',
          body: { courseId, name },
        });
      }
      onCreated(created);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTemplate = templates.find((tpl) => tpl.id === templateId);

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
      title={t('evaluation.newEvaluation').replace('+ ', '')}
      description={t('evaluation.newDescription')}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="evalName">{t('evaluation.nameLabel')} *</Label>
          <Input
            id="evalName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t('evaluation.namePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('evaluation.source')}</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSource('blank')}
              className={
                'rounded-md border p-3 text-left text-sm transition ' +
                (source === 'blank'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-primary/50')
              }
            >
              <p className="font-medium">{t('evaluation.sourceBlank')}</p>
              <p className="text-xs text-muted-foreground">
                {t('evaluation.sourceBlankDesc')}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setSource('template')}
              disabled={templates.length === 0}
              className={
                'rounded-md border p-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ' +
                (source === 'template'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'hover:border-primary/50')
              }
            >
              <p className="font-medium">{t('evaluation.sourceTemplate')}</p>
              <p className="text-xs text-muted-foreground">
                {templates.length === 0
                  ? t('evaluation.sourceTemplateEmpty')
                  : t('evaluation.sourceTemplateDesc')}
              </p>
            </button>
          </div>
        </div>

        {source === 'template' && templates.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="tplPick">{t('evaluation.template')} *</Label>
            <Select
              id="tplPick"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              required
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title} ({tpl._count?.questions ?? 0} {t('template.questions')})
                </option>
              ))}
            </Select>
            {selectedTemplate?.description && (
              <p className="text-xs text-muted-foreground">
                {selectedTemplate.description}
              </p>
            )}
          </div>
        )}

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
            {submitting ? t('common.creating') : t('evaluation.newEvaluation').replace('+ ', '')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
