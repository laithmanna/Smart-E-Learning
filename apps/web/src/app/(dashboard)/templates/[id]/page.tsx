'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { QuestionTemplateDetail, Role, TemplateQuestion } from '@/lib/types';
import { AddTemplateQuestionDialog } from './_add-question-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER'];

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const { user } = useAuth();
  const t = useT();

  const [tpl, setTpl] = useState<QuestionTemplateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [deleting, setDeleting] = useState<TemplateQuestion | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmDeleteTpl, setConfirmDeleteTpl] = useState(false);
  const [deleteTplBusy, setDeleteTplBusy] = useState(false);

  const allowed = user && ALLOWED.includes(user.role);

  useEffect(() => {
    if (!id) return;
    if (user && !allowed) {
      setError('You do not have access to templates.');
      return;
    }
    api<QuestionTemplateDetail>(`/question-templates/${id}`)
      .then(setTpl)
      .catch((e: Error) => setError(e.message));
  }, [id, user, allowed]);

  async function deleteQuestion() {
    if (!deleting || !tpl) return;
    setDeleteBusy(true);
    try {
      await api(`/template-questions/${deleting.id}`, { method: 'DELETE' });
      setTpl({ ...tpl, questions: tpl.questions.filter((q) => q.id !== deleting.id) });
      setDeleting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  }

  async function deleteTemplate() {
    if (!tpl) return;
    setDeleteTplBusy(true);
    try {
      await api(`/question-templates/${tpl.id}`, { method: 'DELETE' });
      router.push('/templates');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleteTplBusy(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/templates" className="text-sm text-muted-foreground hover:underline">
          {t('common.backToTemplates')}
        </Link>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!tpl) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/templates"
          className="text-sm text-muted-foreground hover:underline"
        >
          {t('common.backToTemplates')}
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{tpl.title}</h1>
          {tpl.description && (
            <p className="text-sm text-muted-foreground">{tpl.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {tpl.questions.length} {t('template.questions')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            {t('template.addQuestion')}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setConfirmDeleteTpl(true)}
            disabled={deleteTplBusy}
          >
            {t('template.deleteTemplate')}
          </Button>
        </div>
      </div>

      {tpl.questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('exam.noQuestions')}{' '}
            <button onClick={() => setAddOpen(true)} className="text-primary underline">
              {t('template.addFirstQuestion')}
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tpl.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="flex items-start justify-between gap-4 pt-6">
                <div className="flex-1 space-y-1">
                  <p className="text-xs uppercase text-muted-foreground">
                    {t('exam.question')} {i + 1}
                  </p>
                  <p className="font-medium">{q.text}</p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleting(q)}
                >
                  {t('common.delete')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddTemplateQuestionDialog
        open={addOpen}
        templateId={tpl.id}
        onClose={() => setAddOpen(false)}
        onAdded={(q) => setTpl({ ...tpl, questions: [...tpl.questions, q] })}
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deleteBusy && setDeleting(null)}
        title={t('template.deleteQuestionConfirm')}
        description={
          deleting ? `"${deleting.text.slice(0, 80)}${deleting.text.length > 80 ? '…' : ''}"` : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={() => void deleteQuestion()} disabled={deleteBusy}>
            {deleteBusy ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={confirmDeleteTpl}
        onClose={() => !deleteTplBusy && setConfirmDeleteTpl(false)}
        title={t('template.deleteTemplateConfirm')}
        description={t('template.deleteTemplateDesc').replace('{name}', tpl.title)}
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setConfirmDeleteTpl(false)}
            disabled={deleteTplBusy}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void deleteTemplate()}
            disabled={deleteTplBusy}
          >
            {deleteTplBusy ? t('common.deleting') : t('template.deleteTemplate')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
