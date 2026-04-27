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
  countKey?: 'students' | 'trainers' | 'clients' | 'admins' | 'coordinators';
  group: 'overview' | 'people' | 'library';
}

const NAV: NavItem[] = [
  { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, group: 'overview',
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'] },
  { href: '/courses', labelKey: 'courses', icon: GraduationCap, group: 'overview',
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'] },
  { href: '/students', labelKey: 'students', icon: Users, countKey: 'students', group: 'people',
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'CLIENT'] },
  { href: '/trainers', labelKey: 'trainers', icon: UserCog, countKey: 'trainers', group: 'people',
    roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/coordinators', labelKey: 'coordinators', icon: ClipboardList, countKey: 'coordinators', group: 'people',
    roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/clients', labelKey: 'clients', icon: Building2, countKey: 'clients', group: 'people',
    roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/admins', labelKey: 'admins', icon: Shield, countKey: 'admins', group: 'people',
    roles: ['SUPER_ADMIN'] },
  { href: '/templates', labelKey: 'templates', icon: FileText, group: 'library',
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'] },
];

const GROUP_LABELS: Record<NavItem['group'], string> = {
  overview: 'Overview',
  people: 'People',
  library: 'Library',
};

const STORAGE_KEY = 'sel_sidebar_collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { dir } = useLocale();
  const t = useT();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [counts, setCounts] = useState<Partial<Record<NonNullable<NavItem['countKey']>, number>>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === '1') setCollapsed(true);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed, hydrated]);

  // Pull counts from /api/dashboard
  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const { api } = await import('@/lib/api');
        type Stats = Record<string, number | string | undefined>;
        const stats = await api<Stats>('/dashboard');
        setCounts({
          students: Number(stats.students ?? 0),
          trainers: Number(stats.trainers ?? 0),
          coordinators: Number(stats.coordinators ?? 0),
          admins: Number(stats.admins ?? 0),
          clients: Number(stats.clients ?? 0),
        });
      } catch {
        // ignore — sidebar will simply not show counts
      }
    })();
  }, [user]);

  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const isRtl = dir === 'rtl';
  const collapseIcon = isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />;
  const expandIcon = isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />;

  // Group items by section
  const grouped: Record<NavItem['group'], NavItem[]> = { overview: [], people: [], library: [] };
  for (const item of items) grouped[item.group].push(item);

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

      {/* Brand */}
      {!collapsed ? (
        <div className="mb-5 flex items-center gap-3">
          <LearnovaMark size={36} />
          <div className="leading-tight">
            <p className="text-base font-bold tracking-tight">{t('app.name')}</p>
            <p className="text-xs text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex items-center justify-center">
          <LearnovaMark size={28} />
        </div>
      )}

      {/* Workspace selector */}
      {!collapsed ? (
        <button className="mb-5 flex w-full items-center gap-2.5 rounded-2xl border border-border/60 bg-background/60 p-3 text-left transition-colors hover:bg-secondary">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand-soft text-sm font-bold text-primary">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">
              {user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{user.role}</p>
          </div>
          <ChevronRight className={cn('h-4 w-4 text-muted-foreground', isRtl && 'rotate-180')} />
        </button>
      ) : null}

      {/* Nav groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto">
        {(Object.keys(grouped) as NavItem['group'][]).map((group) => {
          const list = grouped[group];
          if (list.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              {!collapsed && (
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {GROUP_LABELS[group]}
                </p>
              )}
              {list.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/');
                const Icon = item.icon;
                const label = t(`nav.${item.labelKey}`);
                const count = item.countKey ? counts[item.countKey] : undefined;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? label : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200',
                      collapsed ? 'h-10 w-full justify-center' : 'px-3 py-2.5',
                      active
                        ? 'bg-accent text-accent-foreground shadow-brand-sm'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{label}</span>
                        {typeof count === 'number' && (
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                              active
                                ? 'bg-white/60 text-primary'
                                : 'bg-secondary text-muted-foreground group-hover:bg-card',
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer toggles */}
      <div className={cn('space-y-2', collapsed && 'flex flex-col items-center')}>
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
          <Button variant="outline" size="sm" onClick={() => void logout()} className="w-full">
            {t('auth.signOut')}
          </Button>
        )}
      </div>
    </aside>
  );
}
