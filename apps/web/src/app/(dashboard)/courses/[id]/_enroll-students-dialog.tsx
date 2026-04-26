'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Student } from '@/lib/types';

type Mode = 'existing' | 'new';

interface Props {
  open: boolean;
  courseId: string;
  enrolledStudentIds: Set<string>;
  onClose: () => void;
  onSuccess: (summary: string) => void;
}

export function EnrollStudentsDialog({
  open,
  courseId,
  enrolledStudentIds,
  onClose,
  onSuccess,
}: Props) {
  const [mode, setMode] = useState<Mode>('existing');

  // ----- Existing student mode -----
  const [allStudents, setAllStudents] = useState<Student[] | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [enrolling, setEnrolling] = useState(false);

  // ----- New student mode -----
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [socialId, setSocialId] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [password, setPassword] = useState('User@123');
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    api<Student[]>('/students')
      .then(setAllStudents)
      .catch((e: Error) => setError(e.message));
  }, [open]);

  function reset() {
    setMode('existing');
    setSearch('');
    setSelected(new Set());
    setName('');
    setEmail('');
    setPhone('');
    setSocialId('');
    setGender('');
    setPassword('User@123');
    setError(null);
  }

  function close() {
    if (enrolling || creating) return;
    reset();
    onClose();
  }

  const candidates = useMemo(() => {
    if (!allStudents) return null;
    const q = search.trim().toLowerCase();
    return allStudents
      .filter((s) => !enrolledStudentIds.has(s.id))
      .filter((s) =>
        !q
          ? true
          : s.name.toLowerCase().includes(q) ||
            s.user.email.toLowerCase().includes(q) ||
            (s.socialId ?? '').toLowerCase().includes(q),
      );
  }, [allStudents, search, enrolledStudentIds]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function enrollSelected() {
    if (selected.size === 0) return;
    setEnrolling(true);
    setError(null);
    try {
      const ids = Array.from(selected);
      await Promise.all(
        ids.map((studentId) =>
          api('/enrollments', {
            method: 'POST',
            body: { courseId, studentId },
          }),
        ),
      );
      onSuccess(`Enrolled ${ids.length} student${ids.length === 1 ? '' : 's'}.`);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enroll failed');
    } finally {
      setEnrolling(false);
    }
  }

  async function createAndEnroll(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const created = await api<Student>('/students', {
        method: 'POST',
        body: {
          email,
          password,
          name,
          ...(phone ? { phone } : {}),
          ...(socialId ? { socialId } : {}),
          ...(gender ? { gender } : {}),
        },
      });
      await api('/enrollments', {
        method: 'POST',
        body: { courseId, studentId: created.id },
      });
      onSuccess(`Created ${created.name} and enrolled them.`);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Enroll students"
      description="Pick existing students or create a new one — they'll be added to this course."
      className="max-w-2xl"
    >
      <div className="mb-4 flex gap-1 border-b">
        <TabBtn active={mode === 'existing'} onClick={() => setMode('existing')}>
          Existing student
        </TabBtn>
        <TabBtn active={mode === 'new'} onClick={() => setMode('new')}>
          New student
        </TabBtn>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {mode === 'existing' && (
        <div className="space-y-4">
          <Input
            placeholder="Search by name, email, or social ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-72 overflow-y-auto rounded-md border">
            {!candidates && (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            )}
            {candidates && candidates.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">
                {allStudents && allStudents.length > 0
                  ? 'All students are already enrolled or no match.'
                  : 'No students yet — switch to "New student" tab.'}
              </p>
            )}
            {candidates &&
              candidates.map((s) => (
                <label
                  key={s.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0',
                    'hover:bg-accent',
                    selected.has(s.id) && 'bg-accent',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.user.email}
                      {s.phone ? ` · ${s.phone}` : ''}
                      {s.socialId ? ` · ID ${s.socialId}` : ''}
                    </p>
                  </div>
                </label>
              ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selected.size} selected
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={close} disabled={enrolling}>
                Cancel
              </Button>
              <Button
                onClick={() => void enrollSelected()}
                disabled={enrolling || selected.size === 0}
              >
                {enrolling ? 'Enrolling…' : `Enroll ${selected.size}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {mode === 'new' && (
        <form onSubmit={createAndEnroll} className="space-y-4">
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            We&apos;ll create a Student account and enroll them in this course in one step.
            They can log in immediately with the password below.
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-name">Full name *</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">Email *</Label>
            <Input
              id="new-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone</Label>
              <Input
                id="new-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-social">Social / National ID</Label>
              <Input
                id="new-social"
                value={socialId}
                onChange={(e) => setSocialId(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-gender">Gender</Label>
              <Select
                id="new-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
              >
                <option value="">— not set —</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Initial password *</Label>
              <Input
                id="new-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create & enroll'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'border-b-2 px-4 py-2 text-sm transition-colors',
        active
          ? 'border-primary font-semibold text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
