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
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
}

const NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'],
  },
  {
    href: '/courses',
    label: 'Courses',
    icon: GraduationCap,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'],
  },
  {
    href: '/students',
    label: 'Students',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'CLIENT'],
  },
  {
    href: '/trainers',
    label: 'Trainers',
    icon: UserCog,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/coordinators',
    label: 'Coordinators',
    icon: ClipboardList,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/templates',
    label: 'Templates',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER'],
  },
];

const STORAGE_KEY = 'sel_sidebar_collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
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

  return (
    <aside
      className={cn(
        'relative flex h-screen shrink-0 flex-col border-r bg-card transition-[width] duration-200 ease-out',
        collapsed ? 'w-16 px-2 py-4' : 'w-60 p-4',
      )}
    >
      {/* Toggle button (top-right of sidebar, slightly overhanging) */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'absolute -right-3 top-6 z-10 flex h-6 w-6 items-center justify-center',
          'rounded-full border bg-card shadow-sm hover:bg-accent',
          'transition-colors',
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Brand / user */}
      {!collapsed ? (
        <div className="mb-6">
          <p className="font-semibold">Smart E-Learning</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <p className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs">
            {user.role}
          </p>
        </div>
      ) : (
        <div
          className="mb-6 flex h-9 w-full items-center justify-center rounded-md bg-secondary text-sm font-bold"
          title={`${user.email} · ${user.role}`}
        >
          {user.email.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md text-sm transition-colors',
                collapsed ? 'h-10 w-full justify-center' : 'px-3 py-2',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: theme + sign out */}
      <div className={cn('space-y-2', collapsed && 'flex flex-col items-center')}>
        <ThemeToggle compact={collapsed} />
        {collapsed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void logout()}
            aria-label="Sign out"
            title="Sign out"
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
            Sign out
          </Button>
        )}
      </div>
    </aside>
  );
}
