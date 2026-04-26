'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

// Track how many dialogs are currently open so we only toggle body scroll once.
let openCount = 0;

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  // Always-current onClose, no need to depend on it in the effect
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);

    if (openCount === 0) {
      document.body.style.overflow = 'hidden';
    }
    openCount++;

    return () => {
      document.removeEventListener('keydown', onKey);
      openCount = Math.max(0, openCount - 1);
      if (openCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-xl border bg-card shadow-lg',
          'max-h-[calc(100vh-2rem)] overflow-y-auto',
          className,
        )}
      >
        <div className="border-b p-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
