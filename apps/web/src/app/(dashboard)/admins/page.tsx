'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Admin, Role } from '@/lib/types';
import { CreateAdminDialog } from './_create-admin-dialog';
import { EditAdminDialog } from './_edit-admin-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN'];

export default function AdminsPage() {
  const { user } = useAuth();
  const t = useT();
  const [list, setList] = useState<Admin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState<Admin | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [resetTemp, setResetTemp] = useState<{ name: string; password: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = user && ALLOWED.includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (!allowed) {
      setError('Only SuperAdmin can manage admins.');
      return;
    }
    api<Admin[]>('/admins')
      .then(setList)
      .catch((e: Error) => setError(e.message));
  }, [user, allowed]);

  const filtered = useMemo(() => {
    if (!list) return null;
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.user.email.toLowerCase().includes(q) ||
        (a.phone ?? '').toLowerCase().includes(q),
    );
  }, [list, search]);

  async function toggleActive(a: Admin) {
    if (a.user.role === 'SUPER_ADMIN') return; // safety guard
    setBusyId(a.id);
    const next = !a.user.isActive;
    try {
      await api(`/users/${a.userId}/${next ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
      setList((prev) =>
        prev
          ? prev.map((x) =>
              x.id === a.id ? { ...x, user: { ...x.user, isActive: next } } : x,
            )
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(a: Admin) {
    setBusyId(a.id);
    try {
      const out = await api<{ tempPassword: string }>(`/users/${a.userId}/reset-password`, {
        method: 'POST',
      });
      setResetTemp({ name: a.name, password: out.tempPassword });
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
      await api(`/admins/${deleting.id}`, { method: 'DELETE' });
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
        <h1 className="text-2xl font-bold">{t('userMgmt.adminTitle')}</h1>
        <p className="text-destructive">{t('userMgmt.adminOnly')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('userMgmt.adminTitle')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('userMgmt.adminDesc')}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          {t('userMgmt.adminNew')}
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
        <p className="text-muted-foreground">{t('userMgmt.noMatch').replace('{role}', t('userMgmt.adminRole'))}</p>
      )}

      {filtered && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('common.name')}</th>
                <th className="p-3">{t('common.email')}</th>
                <th className="p-3">{t('common.phone')}</th>
                <th className="p-3">{t('common.role')}</th>
                <th className="p-3">{t('common.active')}</th>
                <th className="p-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((a) => {
                const isSuper = a.user.role === 'SUPER_ADMIN';
                return (
                  <tr key={a.id}>
                    <td className="p-3 font-medium">{a.name}</td>
                    <td className="p-3 text-muted-foreground">{a.user.email}</td>
                    <td className="p-3">{a.phone ?? '—'}</td>
                    <td className="p-3">
                      {isSuper ? (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          {t('userMgmt.superAdminBadge')}
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {t('userMgmt.adminBadge')}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {a.user.isActive ? (
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
                          onClick={() => setEditing(a)}
                          disabled={busyId === a.id}
                        >
                          {t('common.edit')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void resetPassword(a)}
                          disabled={busyId === a.id}
                        >
                          {t('userMgmt.resetPassword')}
                        </Button>
                        {isSuper ? (
                          <Button size="sm" variant="outline" disabled title={t('userMgmt.protectedTitle')}>
                            {t('userMgmt.protected')}
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void toggleActive(a)}
                              disabled={busyId === a.id}
                            >
                              {a.user.isActive ? t('userMgmt.deactivate') : t('userMgmt.activate')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleting(a)}
                              disabled={busyId === a.id}
                            >
                              {t('common.delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <CreateAdminDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(a) => setList((prev) => (prev ? [a, ...prev] : [a]))}
      />

      <EditAdminDialog
        admin={editing}
        onClose={() => setEditing(null)}
        onUpdated={(a) =>
          setList((prev) => (prev ? prev.map((x) => (x.id === a.id ? a : x)) : prev))
        }
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deletingBusy && setDeleting(null)}
        title={t('userMgmt.deleteUserConfirm').replace('{role}', t('userMgmt.adminRole'))}
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
              {t('userMgmt.tempPasswordHelp').replace('{role}', t('userMgmt.adminRole'))}
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
