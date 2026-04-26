'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  compact?: boolean;
}

export function ThemeToggle({ className, compact }: Props) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        aria-label="Theme"
        className={cn(compact ? 'w-9 px-0' : 'w-full', className)}
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  function cycle() {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  }

  const icon =
    theme === 'system' ? (
      <Monitor className="h-4 w-4" />
    ) : resolvedTheme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );

  const label = theme === 'system' ? 'System' : resolvedTheme === 'dark' ? 'Dark' : 'Light';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={cycle}
      aria-label={`Theme: ${label}`}
      title={compact ? `Theme: ${label}` : undefined}
      className={cn(compact ? 'w-9 px-0' : 'w-full', className)}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </Button>
  );
}
