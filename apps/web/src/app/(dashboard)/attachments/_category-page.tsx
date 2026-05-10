'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { AttachmentCategory, CourseAttachmentWithCourse } from '@/lib/types';
import { uploadUrl } from '@/lib/utils';

function fmtDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function fmtRange(start: string, end: string) {
  return `${fmtDate(start)} → ${fmtDate(end)}`;
}

export function AttachmentCategoryListPage({
  category,
  title,
  description,
}: {
  category: AttachmentCategory;
  title: string;
  description: string;
}) {
  const t = useT();
  const [rows, setRows] = useState<CourseAttachmentWithCourse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CourseAttachmentWithCourse[]>(`/attachments/by-category/${category}`)
      .then(setRows)
      .catch((e: Error) => setError(e.message));
  }, [category]);

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
        <h1 className="text-2xl font-bold tracking-tight md:text-[26px]">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
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
                <th className="p-3">{t('attachments.courseCol')}</th>
                <th className="p-3">{t('attachments.convenedOn')}</th>
                <th className="p-3">{t('attachments.trainerCol')}</th>
                <th className="p-3">{t('attachments.fileCol')}</th>
                <th className="p-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((a) => {
                const url = uploadUrl(a.filePath);
                return (
                  <tr key={a.id}>
                    <td className="p-3 font-medium">
                      <Link
                        href={`/courses/${a.course.id}`}
                        className="hover:underline"
                      >
                        {a.course.courseName}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {fmtRange(a.course.startDate, a.course.endDate)}
                    </td>
                    <td className="p-3">{a.course.trainer?.name ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">
                      <span className="inline-block max-w-[280px] truncate align-middle">
                        {a.fileName}
                      </span>
                      <span className="ms-2 text-xs text-muted-foreground/70">
                        · {fmtDate(a.uploadedAt)}
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
