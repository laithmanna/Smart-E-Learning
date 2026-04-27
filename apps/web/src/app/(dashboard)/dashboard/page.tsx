'use client';

import {
  ArrowUpRight,
  ClipboardList,
  GraduationCap,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useLocale, useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Stats = Record<string, number | string>;

interface TodayHero {
  classesToday: number;
  activeCourses: number;
  students: number;
  attendancePct: number | null;
}

interface UpNextItem {
  id: string;
  day: string;
  month: string;
  title: string;
  meta: string;
  status: 'live' | 'pending' | 'scheduled';
  statusLabel: string;
}

interface MomentumPoint {
  label: string;
  enrollments: number;
  completions: number;
}

const PILL_STYLES: Record<UpNextItem['status'], string> = {
  live: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

// Spell out small numbers for a friendlier hero copy ("Five classes today")
const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];
function nWord(n: number) {
  return n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}

function makeSpark(seed: number, n = 14, base = 30): { v: number }[] {
  const out: { v: number }[] = [];
  let x = base;
  for (let i = 0; i < n; i++) {
    x += Math.sin(i * 0.55 + seed) * 5 + (Math.random() - 0.4) * 2.5;
    out.push({ v: Math.max(8, x) });
  }
  return out;
}

export default function DashboardPage() {
  const t = useT();
  const { locale } = useLocale();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [hero, setHero] = useState<TodayHero | null>(null);
  const [upNext, setUpNext] = useState<UpNextItem[] | null>(null);
  const [momentum, setMomentum] = useState<MomentumPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>('/dashboard')
      .then(setStats)
      .catch((e: Error) => setError(e.message));
    api<TodayHero>('/dashboard/today')
      .then(setHero)
      .catch(() => {});
    api<UpNextItem[]>('/dashboard/up-next')
      .then(setUpNext)
      .catch(() => {});
    api<MomentumPoint[]>('/dashboard/momentum')
      .then(setMomentum)
      .catch(() => {});
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!stats) return <p className="text-muted-foreground">{t('common.loading')}</p>;

  const greetingRaw = user?.email?.split('@')[0] ?? '';
  const greetingName = greetingRaw.replace(/[^a-zA-Z]/g, '');
  const greetingDisplay = greetingName
    ? greetingName.charAt(0).toUpperCase() + greetingName.slice(1)
    : '';

  // Time-of-day greeting
  const hour = new Date().getHours();
  const greetingKey =
    hour < 12 ? 'dashboard.goodMorning' : hour < 18 ? 'dashboard.goodAfternoon' : 'dashboard.goodEvening';

  // Build the "X classes today" line based on locale (digits in Arabic, words in English)
  function classesTodayText(n: number): string {
    if (n === 0) return t('dashboard.classesToday_zero');
    if (n === 1) return t('dashboard.classesToday_one');
    const display = locale === 'en' ? nWord(n) : String(n);
    return t('dashboard.classesToday_other').replace('{count}', display);
  }

  // Hero description
  function heroDescription(h: TodayHero): string {
    const coursesPlural = h.activeCourses === 1 ? '' : 's';
    if (h.attendancePct === null) {
      return t('dashboard.heroDescriptionNoAttendance')
        .replace('{students}', String(h.students))
        .replace('{courses}', String(h.activeCourses))
        .replace('{coursesPlural}', coursesPlural);
    }
    return t('dashboard.heroDescription')
      .replace('{students}', String(h.students))
      .replace('{courses}', String(h.activeCourses))
      .replace('{coursesPlural}', coursesPlural)
      .replace('{pct}', String(h.attendancePct));
  }

  // Compute up-next status label from status + statusLabel (backend gives "In 2h" — extract hours for translation)
  function upNextLabel(item: UpNextItem): string {
    if (item.status === 'live') return t('dashboard.statusLive');
    if (item.status === 'scheduled') return t('dashboard.statusScheduled');
    // pending → backend label is "Soon" or "In Xh"
    const m = /^In\s+(\d+)h$/i.exec(item.statusLabel);
    if (m) return t('dashboard.statusInHours').replace('{h}', m[1] ?? '');
    return t('dashboard.statusSoon');
  }

  type KpiCfg = {
    icon: LucideIcon;
    label: string;
    value: number | string;
    delta: string;
    deltaUp: boolean;
    iconBg: string;
    iconColor: string;
    chartColor: string;
  };

  const kpis: KpiCfg[] = [
    {
      icon: GraduationCap,
      label: t('dashboard.kpiActiveCourses'),
      value: Number(stats.coursesActive ?? 0),
      delta: '14%',
      deltaUp: true,
      iconBg: 'bg-gradient-brand-soft',
      iconColor: 'text-primary',
      chartColor: '#6D5DF6',
    },
    {
      icon: Users,
      label: t('dashboard.kpiEnrolledStudents'),
      value: hero?.students ?? Number(stats.students ?? 0),
      delta: '24',
      deltaUp: true,
      iconBg: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      chartColor: '#60A5FA',
    },
    {
      icon: TrendingUp,
      label: t('dashboard.kpiAttendanceRate'),
      value: hero?.attendancePct !== null && hero?.attendancePct !== undefined
        ? `${hero.attendancePct}%`
        : '—',
      delta: '2.1pt',
      deltaUp: true,
      iconBg: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      chartColor: '#8B7CF6',
    },
    {
      icon: ClipboardList,
      label: t('dashboard.kpiPendingEvaluations'),
      value: Number(stats.evaluationsPublished ?? 3),
      delta: '5',
      deltaUp: false,
      iconBg: 'bg-rose-50 dark:bg-rose-900/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      chartColor: '#F87171',
    },
  ];

  const todayStr = new Date().toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <Card className="overflow-hidden border-transparent bg-gradient-brand-soft shadow-brand-md">
        <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-start md:gap-10">
          <div className="space-y-3">
            <p className="text-2xl font-semibold leading-tight md:text-[28px]">
              {t(greetingKey as 'dashboard.goodMorning')}
              {greetingDisplay ? `, ${greetingDisplay}` : ''}{' '}
              <span className="inline-block">👋</span>
            </p>
            <p className="text-2xl font-bold text-gradient-brand md:text-[28px]">
              {hero ? classesTodayText(hero.classesToday) : '…'}
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              {hero ? heroDescription(hero) : t('dashboard.loadingLive')}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-medium shadow-brand-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              {t('dashboard.liveSync')}
            </span>
            <p className="text-sm font-medium text-muted-foreground md:text-end">
              {todayStr}
            </p>
            <Link
              href="/courses"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              {t('dashboard.viewSyncDetails')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          const series = makeSpark(i + 1, 14, 22 + i * 5);
          return (
            <Card
              key={k.label}
              className="transition duration-200 hover:-translate-y-0.5 hover:shadow-brand-md"
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', k.iconBg)}>
                    <Icon className={cn('h-5 w-5', k.iconColor)} />
                  </div>
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold',
                      k.deltaUp
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
                    )}
                  >
                    {k.deltaUp ? '↑' : '↓'} {k.delta}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">{k.value}</p>
                </div>
                <div className="-mb-1 -mx-1 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={series}>
                      <Line
                        type="monotone"
                        dataKey="v"
                        stroke={k.chartColor}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enrollment momentum + Up next */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold">{t('dashboard.enrollmentMomentum')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.enrollmentMomentumDesc')}
                </p>
              </div>
              <div className="flex gap-1">
                {[
                  { key: 'period4w', i: 0 },
                  { key: 'period12w', i: 1 },
                  { key: 'periodYtd', i: 2 },
                ].map(({ key, i }) => (
                  <button
                    key={key}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-semibold transition',
                      i === 1
                        ? 'bg-secondary text-foreground'
                        : 'text-muted-foreground hover:bg-secondary/60',
                    )}
                  >
                    {t(`dashboard.${key}` as 'dashboard.period4w')}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-72">
              {!momentum && (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t('common.loading')}
                </div>
              )}
              {momentum && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={momentum} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 6" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    cursor={{ stroke: '#6D5DF6', strokeDasharray: '4 4', strokeWidth: 1.5 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: 'none',
                      background: '#6D5DF6',
                      color: '#fff',
                      fontSize: 12,
                      padding: '8px 12px',
                      boxShadow: '0 8px 24px rgba(109,93,246,0.25)',
                    }}
                    labelStyle={{ color: '#fff', fontSize: 11, marginBottom: 4 }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="enrollments"
                    name={t('dashboard.legendNewEnrollments')}
                    stroke="#6D5DF6"
                    strokeWidth={2.5}
                    fill="url(#enroll-1)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completions"
                    name={t('dashboard.legendCompletions')}
                    stroke="#60A5FA"
                    strokeWidth={2.5}
                    fill="url(#enroll-2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#6D5DF6]" /> {t('dashboard.legendNewEnrollments')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#60A5FA]" /> {t('dashboard.legendCompletions')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-semibold">{t('dashboard.upNext')}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.upNextSubtitle')}</p>
              </div>
              <Link
                href="/courses"
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t('dashboard.calendar')} →
              </Link>
            </div>
            {!upNext && (
              <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
            )}
            {upNext && upNext.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t('dashboard.nothingScheduled')}
              </p>
            )}
            {upNext && upNext.length > 0 && (
              <ul className="space-y-1">
                {upNext.slice(0, 4).map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-secondary/60"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-brand-soft text-center leading-none">
                      <span className="text-base font-bold text-primary">{u.day}</span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {u.month}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{u.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.meta}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        PILL_STYLES[u.status],
                      )}
                    >
                      {upNextLabel(u)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
