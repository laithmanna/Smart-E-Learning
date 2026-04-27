'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { QuestionTemplate, Role } from '@/lib/types';
import { CreateTemplateDialog } from './_create-template-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER'];

export default function TemplatesPage() {
  const { user } = useAuth();
  const t = useT();
  const [list, setList] = useState<QuestionTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const allowed = user && ALLOWED.includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (!allowed) {
      setError('You do not have access to templates.');
      return;
    }
    api<QuestionTemplate[]>('/question-templates')
      .then(setList)
      .catch((e: Error) => setError(e.message));
  }, [user, allowed]);

  if (user && !allowed) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t('template.title')}</h1>
        <p className="text-destructive">You do not have access to templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('template.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('template.description')}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          {t('template.newTemplate')}
        </Button>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!list && !error && <p className="text-muted-foreground">{t('common.loading')}</p>}
      {list && list.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('template.noTemplates')}{' '}
            <button onClick={() => setCreateOpen(true)} className="text-primary underline">
              {t('template.createFirst')}
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list?.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/templates/${tpl.id}`}
            className="block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full cursor-pointer transition hover:border-primary hover:shadow-md">
              <CardHeader>
                <CardTitle>{tpl.title}</CardTitle>
                {tpl.description && (
                  <p className="text-sm text-muted-foreground">{tpl.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {tpl._count?.questions ?? 0} {t('template.questions')} · {t('template.createdAt')}{' '}
                  {new Date(tpl.createdAt).toISOString().slice(0, 10)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <CreateTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(tpl) =>
          setList((prev) =>
            prev ? [{ ...tpl, _count: { questions: 0 } }, ...prev] : [tpl],
          )
        }
      />
    </div>
  );
}
