'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { CourseClass, EnrollmentRow } from '@/lib/types';

interface ExistingAttendance {
  id: string;
  classId: string;
  studentId: string;
  present: boolean;
}

interface Props {
  klass: CourseClass | null;
  enrollments: EnrollmentRow[] | null;
  onClose: () => void;
  onSaved: () => void;
}

export function TakeAttendanceDialog({
  klass,
  enrollments,
  onClose,
  onSaved,
}: Props) {
  const t = useT();
  // studentId -> present
  const [marks, setMarks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!klass || !enrollments) return;
    setError(null);
    setLoading(true);

    // Default everyone to present, then overlay any existing records
    const initial: Record<string, boolean> = {};
    for (const e of enrollments) initial[e.studentId] = true;

    api<ExistingAttendance[]>(`/attendance?classId=${klass.id}`)
      .then((rows) => {
        const map = { ...initial };
        for (const r of rows) {
          map[r.studentId] = r.present;
        }
        setMarks(map);
      })
      .catch(() => {
        // no existing → keep defaults
        setMarks(initial);
      })
      .finally(() => setLoading(false));
  }, [klass, enrollments]);

  const counts = useMemo(() => {
    const total = enrollments?.length ?? 0;
    const present = Object.values(marks).filter(Boolean).length;
    return { present, absent: total - present, total };
  }, [marks, enrollments]);

  function toggle(studentId: string) {
    setMarks((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  }

  function setAll(val: boolean) {
    if (!enrollments) return;
    const next: Record<string, boolean> = {};
    for (const e of enrollments) next[e.studentId] = val;
    setMarks(next);
  }

  async function save() {
    if (!klass || !enrollments) return;
    setSaving(true);
    setError(null);
    try {
      const entries = enrollments.map((e) => ({
        studentId: e.studentId,
        present: !!marks[e.studentId],
      }));
      await api('/attendance/bulk', {
        method: 'POST',
        body: { classId: klass.id, entries },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (!klass) {
    return (
      <Dialog open={false} onClose={onClose} title="">
        <></>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={!!klass}
      onClose={() => !saving && onClose()}
      title={`${t('attendance.title')} — ${klass.topic}`}
      description={`${fmt(klass.classDate)} · ${klass.startTime}–${klass.endTime}`}
      className="max-w-xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-md bg-muted p-3 text-sm">
          <span>
            <span className="font-semibold text-green-700 dark:text-green-400">
              {counts.present}
            </span>{' '}
            {t('attendance.presentCount')} ·{' '}
            <span className="font-semibold text-red-700 dark:text-red-400">
              {counts.absent}
            </span>{' '}
            {t('attendance.absentCount')} · {counts.total} {t('attendance.totalCount')}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setAll(true)}>
              {t('attendance.allPresent')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAll(false)}>
              {t('attendance.allAbsent')}
            </Button>
          </div>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        )}

        {!loading && (!enrollments || enrollments.length === 0) && (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
            {t('attendance.noStudents')}
          </p>
        )}

        {!loading && enrollments && enrollments.length > 0 && (
          <div className="max-h-80 overflow-y-auto rounded-md border">
            {enrollments.map((e) => {
              const present = !!marks[e.studentId];
              return (
                <label
                  key={e.studentId}
                  className={cn(
                    'flex cursor-pointer items-center justify-between border-b p-3 last:border-b-0',
                    'hover:bg-accent',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={present}
                      onChange={() => toggle(e.studentId)}
                      className="h-4 w-4"
                    />
                    <div className="text-sm">
                      <p className="font-medium">{e.student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.student.user.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      present
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                    )}
                  >
                    {present ? t('attendance.present') : t('attendance.absent')}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || loading || !enrollments || enrollments.length === 0}
          >
            {saving ? t('common.saving') : t('attendance.saveAttendance')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function fmt(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
