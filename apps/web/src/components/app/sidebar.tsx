'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/app/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'] },
  { href: '/courses', label: 'Courses', roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'STUDENT', 'CLIENT'] },
  { href: '/students', label: 'Students', roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'TRAINER', 'CLIENT'] },
  { href: '/coordinators', label: 'Coordinators', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { href: '/clients', label: 'Clients', roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r bg-card p-4">
      <div className="mb-6">
        <p className="font-semibold">Smart E-Learning</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
        <p className="mt-1 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs">
          {user.role}
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2">
        <ThemeToggle />
        <Button variant="outline" size="sm" onClick={() => void logout()} className="w-full">
          Sign out
        </Button>
      </div>
    </aside>
  );
}
