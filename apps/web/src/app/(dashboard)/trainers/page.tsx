'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Role, Trainer } from '@/lib/types';
import { uploadUrl } from '@/lib/utils';
import { CreateTrainerDialog } from './_create-trainer-dialog';
import { EditTrainerDialog } from './_edit-trainer-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN'];

export default function TrainersPage() {
  const { user } = useAuth();
  const t = useT();
  const [list, setList] = useState<Trainer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [deleting, setDeleting] = useState<Trainer | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [resetTemp, setResetTemp] = useState<{ name: string; password: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = user && ALLOWED.includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (!allowed) {
      setError('Only SuperAdmin and Admin can manage trainers.');
      return;
    }
    api<Trainer[]>('/trainers')
      .then(setList)
      .catch((e: Error) => setError(e.message));
  }, [user, allowed]);

  const filtered = useMemo(() => {
    if (!list) return null;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (tr) =>
        tr.name.toLowerCase().includes(q) ||
        tr.user.email.toLowerCase().includes(q) ||
        (tr.phone ?? '').toLowerCase().includes(q) ||
        (tr.specialization ?? '').toLowerCase().includes(q),
    );
  }, [list, search]);

  async function toggleActive(tr: Trainer) {
    setBusyId(tr.id);
    const next = !tr.user.isActive;
    try {
      await api(`/users/${tr.userId}/${next ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
      setList((prev) =>
        prev
          ? prev.map((x) =>
              x.id === tr.id ? { ...x, user: { ...x.user, isActive: next } } : x,
            )
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(tr: Trainer) {
    setBusyId(tr.id);
    try {
      const out = await api<{ tempPassword: string }>(`/users/${tr.userId}/reset-password`, {
        method: 'POST',
      });
      setResetTemp({ name: tr.name, password: out.tempPassword });
      setResetCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api(`/trainers/${deleting.id}`, { method: 'DELETE' });
      setList((prev) => (prev ? prev.filter((x) => x.id !== deleting.id) : prev));
      setDeleting(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingBusy(false);
    }
  }

  if (user && !allowed) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t('userMgmt.trainerTitle')}</h1>
        <p className="text-destructive">{t('userMgmt.trainerOnly')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('userMgmt.trainerTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('userMgmt.trainerDesc')}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          {t('userMgmt.trainerNew')}
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder={t('userMgmt.searchByNameEmailSpec')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!filtered && !error && <p className="text-muted-foreground">{t('common.loading')}</p>}
      {filtered && filtered.length === 0 && (
        <p className="text-muted-foreground">{t('userMgmt.noMatch').replace('{role}', t('userMgmt.trainerRole'))}</p>
      )}

      {filtered && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3"></th>
                <th className="p-3">{t('common.name')}</th>
                <th className="p-3">{t('common.email')}</th>
                <th className="p-3">{t('userMgmt.specialization')}</th>
                <th className="p-3">{t('common.phone')}</th>
                <th className="p-3">{t('userMgmt.cv')}</th>
                <th className="p-3">{t('common.active')}</th>
                <th className="p-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((tr) => {
                const photo = uploadUrl(tr.photoPath);
                const cv = uploadUrl(tr.cvPath);
                return (
                  <tr key={tr.id}>
                    <td className="p-3">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={tr.name}
                          className="h-9 w-9 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted text-xs">
                          {tr.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-medium">{tr.name}</td>
                    <td className="p-3 text-muted-foreground">{tr.user.email}</td>
                    <td className="p-3">{tr.specialization ?? '—'}</td>
                    <td className="p-3">{tr.phone ?? '—'}</td>
                    <td className="p-3">
                      {cv ? (
                        <a
                          href={cv}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {t('common.view')}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      {tr.user.isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {t('common.active')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          {t('common.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(tr)}
                          disabled={busyId === tr.id}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void resetPassword(tr)}
                          disabled={busyId === tr.id}
                        >
                          {t('userMgmt.resetPassword')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleActive(tr)}
                          disabled={busyId === tr.id}
                        >
                          {tr.user.isActive ? t('userMgmt.deactivate') : t('userMgmt.activate')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleting(tr)}
                          disabled={busyId === tr.id}
                        >
                          {t('common.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <CreateTrainerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(tr) => setList((prev) => (prev ? [tr, ...prev] : [tr]))}
      />

      <EditTrainerDialog
        trainer={editing}
        onClose={() => setEditing(null)}
        onUpdated={(tr) =>
          setList((prev) => (prev ? prev.map((x) => (x.id === tr.id ? tr : x)) : prev))
        }
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deletingBusy && setDeleting(null)}
        title={t('userMgmt.deleteUserConfirm').replace('{role}', t('userMgmt.trainerRole'))}
        description={
          deleting
            ? t('userMgmt.deleteTrainerDesc')
                .replace('{name}', deleting.name)
                .replace('{email}', deleting.user.email)
            : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deletingBusy}>
            {deletingBusy ? t('common.deleting') : t('common.delete')}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!resetTemp}
        onClose={() => setResetTemp(null)}
        title={t('userMgmt.tempPassword')}
        description={resetTemp ? t('userMgmt.tempPasswordFor').replace('{name}', resetTemp.name) : ''}
      >
        {resetTemp && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t('userMgmt.tempPasswordHelp').replace('{role}', t('userMgmt.trainerRole'))}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
                {resetTemp.password}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(resetTemp.password);
                  setResetCopied(true);
                  setTimeout(() => setResetCopied(false), 1500);
                }}
              >
                {resetCopied ? t('common.copied') : t('common.copy')}
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setResetTemp(null)}>{t('common.done')}</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
