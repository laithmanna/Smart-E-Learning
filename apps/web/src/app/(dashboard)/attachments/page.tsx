'use client';

import { Award, BookOpen, FileText, Presentation } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useT } from '@/i18n/provider';

export default function AttachmentsHubPage() {
  const t = useT();

  const CARDS = [
    {
      href: '/attachments/material',
      title: t('attachments.catMaterial'),
      description: t('attachments.catMaterialDesc'),
      icon: BookOpen,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      href: '/attachments/topics',
      title: t('attachments.catTopics'),
      description: t('attachments.catTopicsDesc'),
      icon: FileText,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      href: '/attachments/presentation',
      title: t('attachments.catPresentation'),
      description: t('attachments.catPresentationDesc'),
      icon: Presentation,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      href: '/attachments/certificates',
      title: t('attachments.catCertificates'),
      description: t('attachments.catCertificatesDesc'),
      icon: Award,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-[26px]">
          {t('attachments.hubTitle')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('attachments.hubDescription')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="block rounded-xl outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full cursor-pointer transition hover:border-primary hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${c.bg}`}>
                    <Icon className={`h-6 w-6 ${c.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{c.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-primary">{t('reports.viewReport')}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
