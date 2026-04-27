'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Student } from '@/lib/types';

export default function StudentsPage() {
  const t = useT();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Student[]>('/students')
      .then(setStudents)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('students.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('students.description')}</p>
      </div>

      {error && <p className="text-destructive">{error}</p>}
      {!students && !error && <p className="text-muted-foreground">{t('common.loading')}</p>}

      {students && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('common.name')}</th>
                <th className="p-3">{t('common.email')}</th>
                <th className="p-3">{t('common.phone')}</th>
                <th className="p-3">{t('common.socialId')}</th>
                <th className="p-3">{t('common.gender')}</th>
                <th className="p-3">{t('common.active')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3 text-muted-foreground">{s.user.email}</td>
                  <td className="p-3">{s.phone ?? '—'}</td>
                  <td className="p-3">{s.socialId ?? '—'}</td>
                  <td className="p-3">{s.gender ?? '—'}</td>
                  <td className="p-3">
                    {s.user.isActive ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                        {t('common.yes')}
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                        {t('common.no')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
