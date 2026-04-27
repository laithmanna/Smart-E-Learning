'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Client, Role } from '@/lib/types';
import { CreateClientDialog } from './_create-client-dialog';
import { EditClientDialog } from './_edit-client-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN'];

export default function ClientsPage() {
  const { user } = useAuth();
  const t = useT();
  const [list, setList] = useState<Client[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [resetTemp, setResetTemp] = useState<{ name: string; password: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = user && ALLOWED.includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (!allowed) {
      setError('Only SuperAdmin and Admin can manage clients.');
      return;
    }
    api<Client[]>('/clients')
      .then(setList)
      .catch((e: Error) => setError(e.message));
  }, [user, allowed]);

  const filtered = useMemo(() => {
    if (!list) return null;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.user.email.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q),
    );
  }, [list, search]);

  async function toggleActive(c: Client) {
    setBusyId(c.id);
    const next = !c.user.isActive;
    try {
      await api(`/users/${c.userId}/${next ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
      setList((prev) =>
        prev
          ? prev.map((x) =>
              x.id === c.id ? { ...x, user: { ...x.user, isActive: next } } : x,
            )
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(c: Client) {
    setBusyId(c.id);
    try {
      const out = await api<{ tempPassword: string }>(`/users/${c.userId}/reset-password`, {
        method: 'POST',
      });
      setResetTemp({ name: c.name, password: out.tempPassword });
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
      await api(`/clients/${deleting.id}`, { method: 'DELETE' });
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
        <h1 className="text-2xl font-bold">{t('userMgmt.clientTitle')}</h1>
        <p className="text-destructive">{t('userMgmt.clientOnly')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('userMgmt.clientTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('userMgmt.clientDesc')}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          {t('userMgmt.clientNew')}
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder={t('userMgmt.searchByNameEmailPhone')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!filtered && !error && <p className="text-muted-foreground">{t('common.loading')}</p>}
      {filtered && filtered.length === 0 && (
        <p className="text-muted-foreground">{t('userMgmt.noMatch').replace('{role}', t('userMgmt.clientRole'))}</p>
      )}

      {filtered && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('userMgmt.organizationCol')}</th>
                <th className="p-3">{t('common.email')}</th>
                <th className="p-3">{t('common.phone')}</th>
                <th className="p-3">{t('common.active')}</th>
                <th className="p-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">{c.user.email}</td>
                  <td className="p-3">{c.phone ?? '—'}</td>
                  <td className="p-3">
                    {c.user.isActive ? (
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
                        onClick={() => setEditing(c)}
                        disabled={busyId === c.id}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void resetPassword(c)}
                        disabled={busyId === c.id}
                      >
                        {t('userMgmt.resetPassword')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(c)}
                        disabled={busyId === c.id}
                      >
                        {c.user.isActive ? t('userMgmt.deactivate') : t('userMgmt.activate')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleting(c)}
                        disabled={busyId === c.id}
                      >
                        {t('common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateClientDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(c) => setList((prev) => (prev ? [c, ...prev] : [c]))}
      />

      <EditClientDialog
        client={editing}
        onClose={() => setEditing(null)}
        onUpdated={(c) =>
          setList((prev) => (prev ? prev.map((x) => (x.id === c.id ? c : x)) : prev))
        }
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deletingBusy && setDeleting(null)}
        title={t('userMgmt.deleteUserConfirm').replace('{role}', t('userMgmt.clientRole'))}
        description={
          deleting
            ? t('userMgmt.deleteUserDesc')
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
              {t('userMgmt.tempPasswordHelp').replace('{role}', t('userMgmt.clientRole'))}
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
