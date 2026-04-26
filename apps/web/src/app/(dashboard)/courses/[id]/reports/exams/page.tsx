'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import { api } from '@/lib/api';
import { ReportActions } from '../_report-actions';

interface ExamsReport {
  course: { id: string; name: string };
  exams: {
    id: string;
    examName: string;
    examDate: string;
    examType: 'MULTIPLE_CHOICE' | 'FREE_TEXT';
    totalMarks: number;
    questionCount: number;
    submissionCount: number;
    avgScore: number;
    avgPct: number;
    maxScore: number;
    minScore: number;
    results: {
      studentId: string;
      studentName: string;
      email: string;
      marksObtained: number;
      pct: number;
    }[];
  }[];
}

export default function ExamsReportPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const [report, setReport] = useState<ExamsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    api<ExamsReport>(`/courses/${courseId}/reports/exams`)
      .then(setReport)
      .catch((e: Error) => setError(e.message));
  }, [courseId]);

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
  if (!report) return <p className="text-muted-foreground">Loading…</p>;

  const examChart = report.exams.map((e) => ({
    name: e.examName.length > 18 ? e.examName.slice(0, 16) + '…' : e.examName,
    'Avg %': e.avgPct,
  }));

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
          excelPath={`/courses/${courseId}/reports/exams.xlsx`}
          excelFileName={`exams-${report.course.name}.xlsx`}
        />
      </div>

      <div>
        <p className="text-xs uppercase text-muted-foreground">Exams report</p>
        <h1 className="text-2xl font-bold">{report.course.name}</h1>
        <p className="text-sm text-muted-foreground">
          {report.exams.length} exam{report.exams.length === 1 ? '' : 's'}
        </p>
      </div>

      {report.exams.length === 0 ? (
        <p className="text-sm text-muted-foreground">No exams created yet.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Average score % per exam</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Avg %" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {report.exams.map((e) => {
            // distribution buckets (0-25%, 26-50%, 51-75%, 76-100%)
            const buckets = [0, 0, 0, 0];
            for (const r of e.results) {
              if (r.pct <= 25) buckets[0] = (buckets[0] ?? 0) + 1;
              else if (r.pct <= 50) buckets[1] = (buckets[1] ?? 0) + 1;
              else if (r.pct <= 75) buckets[2] = (buckets[2] ?? 0) + 1;
              else buckets[3] = (buckets[3] ?? 0) + 1;
            }
            const distData = [
              { name: '0–25%', count: buckets[0] },
              { name: '26–50%', count: buckets[1] },
              { name: '51–75%', count: buckets[2] },
              { name: '76–100%', count: buckets[3] },
            ];
            return (
              <Card key={e.id}>
                <CardHeader>
                  <CardTitle>{e.examName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {e.examType === 'MULTIPLE_CHOICE' ? 'MCQ' : 'Free text'} ·{' '}
                    {new Date(e.examDate).toISOString().slice(0, 10)} · {e.totalMarks} marks
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <Stat label="Submissions" value={e.submissionCount} />
                    <Stat label="Avg" value={`${e.avgScore} (${e.avgPct}%)`} />
                    <Stat label="Max" value={e.maxScore} />
                    <Stat label="Min" value={e.minScore} />
                  </div>

                  {e.results.length > 0 && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="h-56">
                        <p className="mb-2 text-sm font-medium">Distribution</p>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={distData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8b5cf6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="overflow-hidden rounded-md border">
                        <table className="w-full text-xs">
                          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="p-2">Student</th>
                              <th className="p-2">Score</th>
                              <th className="p-2">%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {e.results.map((r) => (
                              <tr key={r.studentId}>
                                <td className="p-2 font-medium">{r.studentName}</td>
                                <td className="p-2">
                                  {r.marksObtained}/{e.totalMarks}
                                </td>
                                <td className="p-2 font-semibold">{r.pct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
