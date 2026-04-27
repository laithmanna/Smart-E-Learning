'use client';

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Shield,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LangToggle } from '@/components/app/lang-toggle';
import { LearnovaMark } from '@/components/app/logo';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useT, useLocale } from '@/i18n/provider';
import type { Messages } from '@/i18n/messages/en';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

interface NavItem {
  href: string;
  labelKey: keyof Messages['nav'];
  icon: LucideIcon;
  roles: Role[];
}

const NAV: NavItem[] = [
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'],
  },
  {
    href: '/courses',
    labelKey: 'courses',
    icon: GraduationCap,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'],
  },
  {
    href: '/students',
    labelKey: 'students',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'CLIENT'],
  },
  {
    href: '/trainers',
    labelKey: 'trainers',
    icon: UserCog,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/coordinators',
    labelKey: 'coordinators',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/clients',
    labelKey: 'clients',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/admins',
    labelKey: 'admins',
    icon: Shield,
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/templates',
    labelKey: 'templates',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'],
  },
];

const STORAGE_KEY = 'sel_sidebar_collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { dir } = useLocale();
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '1') setCollapsed(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    }
  }, [collapsed, hydrated]);

  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));

  // Toggle sits at the OUTSIDE edge — opposite the wall.
  // LTR: wall on left → toggle on right edge (-end-3 = -right-3)
  // RTL: wall on right → toggle on left edge (-end-3 = -left-3)
  // Use logical class so it flips automatically.
  const isRtl = dir === 'rtl';

  // Pick chevron icon based on direction + collapsed state
  // When expanded: arrow points "toward wall" (collapse direction)
  // LTR: collapse → arrow points left;   RTL: collapse → arrow points right
  // When collapsed: arrow points "away from wall" (expand direction)
  const collapseIcon = isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />;
  const expandIcon = isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />;

  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col bg-card transition-[width] duration-200 ease-out',
        isRtl ? 'border-l border-border/60' : 'border-r border-border/60',
        collapsed ? 'w-16 px-2 py-5' : 'w-[260px] p-5',
      )}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        className={cn(
          'absolute top-7 z-10 flex h-6 w-6 items-center justify-center',
          'rounded-full border border-border/60 bg-card shadow-brand-sm hover:bg-accent',
          'transition-colors',
          isRtl ? '-left-3' : '-right-3',
        )}
      >
        {collapsed ? expandIcon : collapseIcon}
      </button>

      {/* Brand: logo + name + tagline */}
      {!collapsed ? (
        <div className="mb-6 flex items-center gap-3">
          <LearnovaMark size={36} />
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight">{t('app.name')}</p>
            <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-center" title={`${t('app.name')} · ${t('app.tagline')}`}>
          <LearnovaMark size={28} />
        </div>
      )}

      {/* Workspace / user pill */}
      {!collapsed && (
        <div className="mb-5 rounded-2xl border border-border/60 bg-background/60 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand-soft text-sm font-bold text-primary">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{user.email.split('@')[0]}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user.role}</p>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('nav.dashboard')}
        </p>
      )}

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          const label = t(`nav.${item.labelKey}`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                collapsed ? 'h-10 w-full justify-center' : 'px-3 py-2.5',
                active
                  ? 'bg-accent text-accent-foreground shadow-brand-sm'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={cn('space-y-2 pt-4', collapsed && 'flex flex-col items-center')}>
        <LangToggle compact={collapsed} />
        <ThemeToggle compact={collapsed} />
        {collapsed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void logout()}
            aria-label={t('auth.signOut')}
            title={t('auth.signOut')}
            className="w-9 px-0"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void logout()}
            className="w-full"
          >
            {t('auth.signOut')}
          </Button>
        )}
      </div>
    </aside>
  );
}
