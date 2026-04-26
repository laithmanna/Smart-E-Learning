'use client';

import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/i18n/provider';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  compact?: boolean;
}

export function LangToggle({ className, compact }: Props) {
  const { locale, setLocale } = useLocale();
  const next = locale === 'en' ? 'ar' : 'en';
  const label = locale === 'en' ? 'العربية' : 'English';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLocale(next)}
      title={`${locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}`}
      className={cn(compact ? 'w-9 px-0' : 'w-full', className)}
    >
      <Languages className="h-4 w-4" />
      {!compact && <span>{label}</span>}
    </Button>
  );
}
