'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { QuestionTemplate, Role } from '@/lib/types';
import { CreateTemplateDialog } from './_create-template-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER'];

export default function TemplatesPage() {
  const { user } = useAuth();
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
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-destructive">You do not have access to templates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable question banks for evaluations and exams.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New template
        </Button>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!list && !error && <p className="text-muted-foreground">Loading…</p>}
      {list && list.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No templates yet.{' '}
            <button onClick={() => setCreateOpen(true)} className="text-primary underline">
              Create your first one.
            </button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list?.map((t) => (
          <Link
            key={t.id}
            href={`/templates/${t.id}`}
            className="block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full cursor-pointer transition hover:border-primary hover:shadow-md">
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
                {t.description && (
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {t._count?.questions ?? 0} question
                  {(t._count?.questions ?? 0) === 1 ? '' : 's'} · created{' '}
                  {new Date(t.createdAt).toISOString().slice(0, 10)}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <CreateTemplateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(t) =>
          setList((prev) =>
            prev ? [{ ...t, _count: { questions: 0 } }, ...prev] : [t],
          )
        }
      />
    </div>
  );
}
