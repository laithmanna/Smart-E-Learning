'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Evaluation, EvaluationReport as EvaluationReportT } from '@/lib/types';
import { ReportActions } from '../_report-actions';

const RATING_ORDER = ['Excellent', 'Good', 'Average', 'Poor', 'Very poor'];
const RATING_COLORS: Record<string, string> = {
  Excellent: '#22c55e',
  Good: '#84cc16',
  Average: '#eab308',
  Poor: '#f97316',
  'Very poor': '#ef4444',
};

export default function EvaluationReportPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [report, setReport] = useState<EvaluationReportT | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    api<Evaluation[]>(`/evaluations?courseId=${courseId}`)
      .then((rows) => {
        setEvaluations(rows);
        if (rows.length > 0 && rows[0]) setSelectedId(rows[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, [courseId]);

  useEffect(() => {
    if (!selectedId) return;
    setReport(null);
    api<EvaluationReportT>(`/evaluations/${selectedId}/report`)
      .then(setReport)
      .catch((e: Error) => setError(e.message));
  }, [selectedId]);

  const totalResponses = useMemo(() => {
    if (!report) return 0;
    return Math.max(...report.questions.map((q) => q.responses.length), 0);
  }, [report]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          href={`/courses/${courseId}/reports`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to reports
        </Link>
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <Link
          href={`/courses/${courseId}/reports`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Back to reports
        </Link>
        <ReportActions
          excelPath={selectedId ? `/evaluations/${selectedId}/report.xlsx` : undefined}
          excelFileName={`evaluation-${selectedId}.xlsx`}
        />
      </div>

      <div>
        <p className="text-xs uppercase text-muted-foreground">Evaluation report</p>
        <h1 className="text-2xl font-bold">
          {report?.name ?? 'Pick an evaluation'}
        </h1>
      </div>

      <div className="max-w-md print:hidden">
        <Select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={evaluations.length === 0}
        >
          {evaluations.length === 0 ? (
            <option value="">No evaluations on this course</option>
          ) : (
            evaluations.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} {ev.isPublished ? '· published' : '· draft'}
              </option>
            ))
          )}
        </Select>
      </div>

      {!report && evaluations.length > 0 && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {report && (
        <>
          <Card>
            <CardContent className="pt-6 text-sm">
              <p>
                <span className="text-muted-foreground">Questions:</span>{' '}
                {report.questions.length}
              </p>
              <p>
                <span className="text-muted-foreground">Total responses:</span>{' '}
                {totalResponses}
              </p>
            </CardContent>
          </Card>

          {report.questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No questions in this evaluation yet.
            </p>
          ) : (
            report.questions.map((q, i) => {
              const counts: Record<string, number> = {};
              for (const r of q.responses) {
                counts[r.rating] = (counts[r.rating] ?? 0) + 1;
              }
              const data = RATING_ORDER.map((label) => ({
                name: label,
                count: counts[label] ?? 0,
              }));
              const others = Object.keys(counts).filter(
                (k) => !RATING_ORDER.includes(k),
              );
              for (const k of others) {
                data.push({ name: k, count: counts[k] ?? 0 });
              }
              return (
                <Card key={q.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Q{i + 1}. {q.question}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {q.responses.length} response
                      {q.responses.length === 1 ? '' : 's'}
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-2">
                    <div className="h-56">
                      {q.responses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No responses yet.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Responses">
                              {data.map((entry, idx) => (
                                <rect
                                  key={idx}
                                  fill={RATING_COLORS[entry.name] ?? '#6366f1'}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {q.responses.length > 0 && (
                      <div className="overflow-hidden rounded-md border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="p-2">Student</th>
                              <th className="p-2">Rating</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {q.responses.map((r) => (
                              <tr key={r.studentId}>
                                <td className="p-2 font-medium">{r.studentName}</td>
                                <td className="p-2">
                                  <span
                                    className="rounded-full px-2 py-0.5 text-white"
                                    style={{
                                      backgroundColor:
                                        RATING_COLORS[r.rating] ?? '#6366f1',
                                    }}
                                  >
                                    {r.rating}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
