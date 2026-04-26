'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { Role, Trainer } from '@/lib/types';
import { uploadUrl } from '@/lib/utils';
import { CreateTrainerDialog } from './_create-trainer-dialog';
import { EditTrainerDialog } from './_edit-trainer-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN'];

export default function TrainersPage() {
  const { user } = useAuth();
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
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.user.email.toLowerCase().includes(q) ||
        (t.phone ?? '').toLowerCase().includes(q) ||
        (t.specialization ?? '').toLowerCase().includes(q),
    );
  }, [list, search]);

  async function toggleActive(t: Trainer) {
    setBusyId(t.id);
    const next = !t.user.isActive;
    try {
      await api(`/users/${t.userId}/${next ? 'activate' : 'deactivate'}`, { method: 'PATCH' });
      setList((prev) =>
        prev
          ? prev.map((x) =>
              x.id === t.id ? { ...x, user: { ...x.user, isActive: next } } : x,
            )
          : prev,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  }

  async function resetPassword(t: Trainer) {
    setBusyId(t.id);
    try {
      const out = await api<{ tempPassword: string }>(`/users/${t.userId}/reset-password`, {
        method: 'POST',
      });
      setResetTemp({ name: t.name, password: out.tempPassword });
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
        <h1 className="text-2xl font-bold">Trainers</h1>
        <p className="text-destructive">Only SuperAdmin and Admin can manage trainers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trainers</h1>
          <p className="text-sm text-muted-foreground">Manage course instructors</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New trainer
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search by name, email, phone, specialization…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!filtered && !error && <p className="text-muted-foreground">Loading…</p>}
      {filtered && filtered.length === 0 && (
        <p className="text-muted-foreground">No trainers match.</p>
      )}

      {filtered && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3"></th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Specialization</th>
                <th className="p-3">Phone</th>
                <th className="p-3">CV</th>
                <th className="p-3">Active</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => {
                const photo = uploadUrl(t.photoPath);
                const cv = uploadUrl(t.cvPath);
                return (
                  <tr key={t.id}>
                    <td className="p-3">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={t.name}
                          className="h-9 w-9 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border bg-muted text-xs">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-medium">{t.name}</td>
                    <td className="p-3 text-muted-foreground">{t.user.email}</td>
                    <td className="p-3">{t.specialization ?? '—'}</td>
                    <td className="p-3">{t.phone ?? '—'}</td>
                    <td className="p-3">
                      {cv ? (
                        <a
                          href={cv}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          View
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      {t.user.isActive ? (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Active
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(t)}
                          disabled={busyId === t.id}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void resetPassword(t)}
                          disabled={busyId === t.id}
                        >
                          Reset password
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleActive(t)}
                          disabled={busyId === t.id}
                        >
                          {t.user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleting(t)}
                          disabled={busyId === t.id}
                        >
                          Delete
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
        onCreated={(t) => setList((prev) => (prev ? [t, ...prev] : [t]))}
      />

      <EditTrainerDialog
        trainer={editing}
        onClose={() => setEditing(null)}
        onUpdated={(t) =>
          setList((prev) => (prev ? prev.map((x) => (x.id === t.id ? t : x)) : prev))
        }
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deletingBusy && setDeleting(null)}
        title="Delete trainer?"
        description={
          deleting
            ? `This will permanently delete ${deleting.name} (${deleting.user.email}), their user account, and uploaded photo/CV.`
            : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deletingBusy}>
            {deletingBusy ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={!!resetTemp}
        onClose={() => setResetTemp(null)}
        title="Temporary password generated"
        description={resetTemp ? `For ${resetTemp.name}` : ''}
      >
        {resetTemp && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this with the trainer. They should change it on first login.
              All existing sessions for this account have been revoked.
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
                {resetCopied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setResetTemp(null)}>Done</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
