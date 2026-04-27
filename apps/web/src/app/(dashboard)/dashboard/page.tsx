'use client';

import {
  ArrowUpRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Sparkles,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Stats = Record<string, number | string>;

interface UpNextItem {
  id: string;
  date: string;
  title: string;
  meta: string;
  status: 'live' | 'pending' | 'scheduled';
}

const STATUS_COLORS: Record<UpNextItem['status'], string> = {
  live: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

// Demo trendline data — purely visual, real time-series can replace later
function makeSpark(seed: number, n = 12, base = 30): { v: number }[] {
  const out: { v: number }[] = [];
  let x = base;
  for (let i = 0; i < n; i++) {
    x += Math.sin(i * 0.7 + seed) * 4 + (Math.random() - 0.4) * 3;
    out.push({ v: Math.max(5, x) });
  }
  return out;
}

export default function DashboardPage() {
  const t = useT();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>('/dashboard')
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  // Synthetic enrollment-momentum series for hero chart
  const momentum = useMemo(() => {
    const labels = ['Feb 3', 'Feb 24', 'Mar 17', 'Apr 7', 'Apr 28'];
    return labels.map((label, i) => ({
      label,
      enrollments: 18 + i * 9 + Math.round(Math.sin(i * 1.3) * 4),
      completions: 8 + i * 5 + Math.round(Math.cos(i * 0.9) * 3),
    }));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!stats) return <p className="text-muted-foreground">{t('common.loading')}</p>;

  // Map backend stat keys to nice cards
  type KpiKey = 'coursesActive' | 'students' | 'attendancePct' | 'evaluationsPublished';
  type KpiCfg = {
    icon: LucideIcon;
    label: string;
    valueFrom: KpiKey;
    fallback?: number;
    delta?: string;
    deltaUp?: boolean;
    color: string;
    bg: string;
    chartColor: string;
  };

  const kpis: KpiCfg[] = [
    {
      icon: GraduationCap,
      label: 'Active courses',
      valueFrom: 'coursesActive',
      fallback: Number(stats.coursesActive ?? 0),
      delta: '+14%',
      deltaUp: true,
      color: 'text-primary',
      bg: 'bg-gradient-brand-soft',
      chartColor: '#6D5DF6',
    },
    {
      icon: Users,
      label: t('reports.studentsKpi'),
      valueFrom: 'students',
      fallback: Number(stats.students ?? 0),
      delta: '+24',
      deltaUp: true,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      chartColor: '#60A5FA',
    },
    {
      icon: TrendingUp,
      label: 'Enrollments',
      valueFrom: 'students',
      fallback: Number(stats.enrollments ?? 0),
      delta: '+2.1pt',
      deltaUp: true,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      chartColor: '#8B7CF6',
    },
    {
      icon: ClipboardList,
      label: 'Pending evaluations',
      valueFrom: 'evaluationsPublished',
      fallback: Number(stats.evaluationsPublished ?? 0),
      delta: '−5',
      deltaUp: false,
      color: 'text-rose-600',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      chartColor: '#F87171',
    },
  ];

  // Demo "Up Next" — could be wired to real data later
  const upNext: UpNextItem[] = [
    { id: '1', date: '27 APR', title: 'Advanced TypeScript — Class 7', meta: '13:00–14:00 · Room A', status: 'live' },
    { id: '2', date: '27 APR', title: 'PMP Practice — Midterm exam', meta: '60 questions · MCQ', status: 'pending' },
    { id: '3', date: '28 APR', title: 'Cybersecurity Awareness', meta: '56 enrolled · Eval due', status: 'pending' },
    { id: '4', date: '29 APR', title: 'Data Analytics with SQL — Class 12', meta: '13:00–14:00', status: 'scheduled' },
  ];

  const greetingName = user?.email?.split('@')[0] ?? 'there';
  const greeting = `Good morning, ${greetingName.charAt(0).toUpperCase() + greetingName.slice(1)}`;

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <Card className="overflow-hidden border-transparent bg-gradient-brand-soft shadow-brand-md">
        <CardContent className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="space-y-3">
            <p className="text-2xl font-semibold leading-tight md:text-3xl">
              {greeting} <span className="inline-block">👋</span>
            </p>
            <p className="text-2xl font-bold text-gradient-brand md:text-3xl">
              {(Number(stats.coursesActive) || 0) + (Number(stats.coursesClosed) || 0)} courses on the go.
            </p>
            <p className="max-w-xl text-sm text-muted-foreground">
              {Number(stats.students) || 0} students across {Number(stats.coursesActive) || 0} active courses.{' '}
              Attendance is tracking ahead of plan.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/courses">
                <Button size="sm">
                  Open courses
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden h-32 w-72 shrink-0 md:block">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={momentum}>
                <defs>
                  <linearGradient id="hero-area-1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D5DF6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6D5DF6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hero-area-2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="enrollments" stroke="#6D5DF6" strokeWidth={2.5} fill="url(#hero-area-1)" />
                <Area type="monotone" dataKey="completions" stroke="#60A5FA" strokeWidth={2.5} fill="url(#hero-area-2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          const series = makeSpark(i + 1, 12, 30 + i * 4);
          return (
            <Card key={k.label} className="transition hover:-translate-y-0.5 hover:shadow-brand-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', k.bg)}>
                    <Icon className={cn('h-5 w-5', k.color)} />
                  </div>
                  {k.delta && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-semibold',
                        k.deltaUp
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
                      )}
                    >
                      {k.deltaUp ? '↑' : '↓'} {k.delta}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-3xl font-bold">{k.fallback}</p>
                </div>
                <div className="-mb-1 -mx-1 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
                      <Line type="monotone" dataKey="v" stroke={k.chartColor} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enrollment momentum + Up Next */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">Enrollment momentum</p>
                <p className="text-xs text-muted-foreground">Students added per week, last 12 weeks</p>
              </div>
              <div className="flex gap-1">
                {['4W', '12W', 'YTD'].map((p, i) => (
                  <button
                    key={p}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition',
                      i === 1
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/60',
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={momentum}>
                  <defs>
                    <linearGradient id="enroll-1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6D5DF6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6D5DF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="enroll-2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    stroke="#6D5DF6"
                    strokeWidth={2.5}
                    fill="url(#enroll-1)"
                    name="New enrollments"
                  />
                  <Area
                    type="monotone"
                    dataKey="completions"
                    stroke="#60A5FA"
                    strokeWidth={2.5}
                    fill="url(#enroll-2)"
                    name="Completions"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#6D5DF6]" /> New enrollments
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#60A5FA]" /> Completions
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">Up next</p>
                <p className="text-xs text-muted-foreground">Today &amp; tomorrow</p>
              </div>
              <Link
                href="/courses"
                className="text-xs font-medium text-primary hover:underline"
              >
                Calendar →
              </Link>
            </div>
            <ul className="space-y-2">
              {upNext.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-secondary/60"
                >
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-brand-soft text-center leading-none">
                    <span className="text-base font-bold text-primary">
                      {u.date.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {u.date.split(' ')[1]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.meta}</p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                      STATUS_COLORS[u.status],
                    )}
                  >
                    {u.status === 'live' ? 'Live now' : u.status === 'pending' ? 'In 2h' : 'Scheduled'}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Pro tip */}
      <Card className="overflow-hidden border-0 bg-gradient-brand text-white shadow-brand-md">
        <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Pro tip</p>
              <p className="text-sm text-white/85">
                Set learning goals for your cohort and track impact in the Reports page.
              </p>
            </div>
          </div>
          <Link href="/courses">
            <Button variant="soft" size="sm" className="bg-white/15 text-white hover:bg-white/25">
              <BookOpen className="h-4 w-4" />
              Explore
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
