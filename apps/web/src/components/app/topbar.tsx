'use client';

import { Bell, ChevronRight, Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useT } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const PATH_KEY: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/courses': 'courses',
  '/students': 'students',
  '/trainers': 'trainers',
  '/coordinators': 'coordinators',
  '/clients': 'clients',
  '/admins': 'admins',
  '/templates': 'templates',
};

export function Topbar() {
  const pathname = usePathname();
  const t = useT();

  // Find best-match key for breadcrumb label
  const matchedKey = Object.keys(PATH_KEY)
    .filter((p) => pathname === p || pathname.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0];
  const sectionKey = matchedKey ? PATH_KEY[matchedKey] : 'dashboard';
  const sectionLabel = sectionKey ? t(`nav.${sectionKey}` as 'nav.dashboard') : '';

  // Show "+ New course" only on /courses (or root /dashboard for global CTA)
  const showCta = pathname.startsWith('/courses') || pathname === '/dashboard';

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border/60 bg-background/80 px-6 backdrop-blur-md">
      {/* Breadcrumb */}
      <nav className="hidden items-center gap-1.5 text-sm md:flex">
        <span className="text-muted-foreground">Workspace</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold capitalize">{sectionLabel}</span>
      </nav>

      {/* Search */}
      <div className="ml-auto flex flex-1 items-center justify-end gap-3 md:flex-initial md:justify-start md:ml-8">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search courses, students…"
            className={cn(
              'h-10 w-72 rounded-full border border-border/60 bg-secondary/60 ps-9 pe-14 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
              'transition',
            )}
          />
          <kbd className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right cluster: bell + CTA */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground hover:bg-secondary transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-gradient-brand ring-2 ring-card" />
        </button>

        {showCta && (
          <Link href="/courses">
            <button className="inline-flex h-10 items-center gap-2 rounded-full bg-gradient-brand px-4 text-sm font-semibold text-white shadow-brand-md transition hover:-translate-y-px hover:shadow-brand-lg">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New course</span>
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
