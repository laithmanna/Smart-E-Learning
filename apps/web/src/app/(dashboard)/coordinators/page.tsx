'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { api } from '@/lib/api';
import type { Coordinator, Role } from '@/lib/types';
import { CreateCoordinatorDialog } from './_create-coordinator-dialog';
import { EditCoordinatorDialog } from './_edit-coordinator-dialog';

const ALLOWED: Role[] = ['SUPER_ADMIN', 'ADMIN'];

export default function CoordinatorsPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Coordinator[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Coordinator | null>(null);
  const [deleting, setDeleting] = useState<Coordinator | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [resetTemp, setResetTemp] = useState<{ name: string; password: string } | null>(null);
  const [resetCopied, setResetCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = user && ALLOWED.includes(user.role);

  useEffect(() => {
    if (!user) return;
    if (!allowed) {
      setError('Only SuperAdmin and Admin can manage coordinators.');
      return;
    }
    api<Coordinator[]>('/coordinators')
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

  async function toggleActive(c: Coordinator) {
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

  async function resetPassword(c: Coordinator) {
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
      await api(`/coordinators/${deleting.id}`, { method: 'DELETE' });
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
        <h1 className="text-2xl font-bold">Coordinators</h1>
        <p className="text-destructive">Only SuperAdmin and Admin can manage coordinators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Coordinators</h1>
          <p className="text-sm text-muted-foreground">
            Manage training program coordinators
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + New coordinator
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!filtered && !error && <p className="text-muted-foreground">Loading…</p>}
      {filtered && filtered.length === 0 && (
        <p className="text-muted-foreground">No coordinators match.</p>
      )}

      {filtered && filtered.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Active</th>
                <th className="p-3 text-right">Actions</th>
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
                        onClick={() => setEditing(c)}
                        disabled={busyId === c.id}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void resetPassword(c)}
                        disabled={busyId === c.id}
                      >
                        Reset password
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void toggleActive(c)}
                        disabled={busyId === c.id}
                      >
                        {c.user.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleting(c)}
                        disabled={busyId === c.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CreateCoordinatorDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(c) => setList((prev) => (prev ? [c, ...prev] : [c]))}
      />

      <EditCoordinatorDialog
        coordinator={editing}
        onClose={() => setEditing(null)}
        onUpdated={(c) =>
          setList((prev) => (prev ? prev.map((x) => (x.id === c.id ? c : x)) : prev))
        }
      />

      <Dialog
        open={!!deleting}
        onClose={() => !deletingBusy && setDeleting(null)}
        title="Delete coordinator?"
        description={
          deleting
            ? `This will permanently delete ${deleting.name} (${deleting.user.email}) and their user account.`
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
              Share this with the coordinator. They should change it on first login.
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
