'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { StudentCertificateRow } from '@/lib/types';
import { uploadUrl } from '@/lib/utils';

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function fmtRange(start: string, end: string) {
  return `${fmtDate(start)} → ${fmtDate(end)}`;
}

export default function StudentCertificatesPage() {
  const t = useT();
  const [rows, setRows] = useState<StudentCertificateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<StudentCertificateRow[]>('/enrollments/certificates')
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/attachments"
          className="text-sm text-muted-foreground hover:underline"
        >
          {t('attachments.backToHub')}
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-[26px]">
          {t('attachments.catCertificates')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('attachments.catCertificatesDesc')}</p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {!rows && !error && (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      )}

      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('attachments.nothingYet')}</p>
      )}

      {rows && rows.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">{t('common.name')}</th>
                <th className="p-3">{t('attachments.courseCol')}</th>
                <th className="p-3">{t('attachments.convenedOn')}</th>
                <th className="p-3">{t('attachments.trainerCol')}</th>
                <th className="p-3">{t('attachments.fileCol')}</th>
                <th className="p-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const url = uploadUrl(r.certificateFilePath);
                const key = `${r.courseId}-${r.studentId}`;
                return (
                  <tr key={key}>
                    <td className="p-3 font-medium">{r.student.name}</td>
                    <td className="p-3">
                      <Link
                        href={`/courses/${r.course.id}`}
                        className="hover:underline"
                      >
                        {r.course.courseName}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {fmtRange(r.course.startDate, r.course.endDate)}
                    </td>
                    <td className="p-3">{r.course.trainer?.name ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">
                      <span className="inline-block max-w-[280px] truncate align-middle">
                        {r.certificateFileName}
                      </span>
                      <span className="ms-2 text-xs text-muted-foreground/70">
                        · {fmtDate(r.certificateUploadedAt)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          {t('common.download')}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
