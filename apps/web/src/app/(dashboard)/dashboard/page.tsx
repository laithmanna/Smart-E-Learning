'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';

type Stats = Record<string, number | string>;

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>('/dashboard')
      .then(setStats)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!stats) return <p className="text-muted-foreground">Loading…</p>;

  const entries = Object.entries(stats).filter(([k]) => k !== 'role');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Role: {String(stats.role)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {entries.map(([key, value]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm capitalize text-muted-foreground">
                {key.replace(/([A-Z])/g, ' $1')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{String(value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
