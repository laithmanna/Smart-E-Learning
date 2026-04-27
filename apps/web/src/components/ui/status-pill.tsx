import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'live'
  | 'pending'
  | 'scheduled'
  | 'success'
  | 'neutral'
  | 'danger';

const variants: Record<StatusVariant, string> = {
  live:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  scheduled:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  success:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  neutral: 'bg-secondary text-foreground',
  danger:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

interface Props {
  variant?: StatusVariant;
  className?: string;
  children: React.ReactNode;
}

export function StatusPill({ variant = 'neutral', className, children }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
