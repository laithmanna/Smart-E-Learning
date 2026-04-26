'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { ReportActions } from '../_report-actions';

interface FullReport {
  course: {
    id: string;
    name: string;
    projectName: string | null;
    startDate: string;
    endDate: string;
    isClosed: boolean;
    trainer: string | null;
    coordinator: string | null;
    client: string | null;
  };
  counts: {
    students: number;
    classes: number;
    exams: number;
    evaluationsPublished: number;
    evaluationsTotal: number;
  };
  attendance: {
    totalMarks: number;
    present: number;
    absent: number;
    attendancePct: number;
  };
  exams: {
    totalSubmissions: number;
    avgScorePct: number;
    perExam: {
      examName: string;
      avgScore: number;
      avgPct: number;
      maxScore: number;
      minScore: number;
      totalMarks: number;
      submissionCount: number;
    }[];
  };
  survey: {
    responseCount: number;
    averageRating: number | null;
  };
}

const COLORS = ['#22c55e', '#ef4444', '#94a3b8'];

export default function FullReportPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const [report, setReport] = useState<FullReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    api<FullReport>(`/courses/${courseId}/reports/full`)
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

  const attendancePieData = [
    { name: 'Present', value: report.attendance.present },
    { name: 'Absent', value: report.attendance.absent },
  ];
  const examChartData = report.exams.perExam.map((e) => ({
    name: e.examName.length > 18 ? e.examName.slice(0, 16) + '…' : e.examName,
    avg: e.avgScore,
    max: e.maxScore,
    min: e.minScore,
  }));

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <Link
            href={`/courses/${courseId}/reports`}
            className="text-sm text-muted-foreground hover:underline"
          >
            ← Back to reports
          </Link>
        </div>
        <ReportActions />
      </div>

      <div>
        <p className="text-xs uppercase text-muted-foreground">Full course report</p>
        <h1 className="text-2xl font-bold">{report.course.name}</h1>
        <p className="text-sm text-muted-foreground">
          {report.course.projectName ?? '—'} ·{' '}
          {new Date(report.course.startDate).toISOString().slice(0, 10)} →{' '}
          {new Date(report.course.endDate).toISOString().slice(0, 10)} ·{' '}
          {report.course.isClosed ? 'Closed' : 'Active'}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Students" value={report.counts.students} />
        <Kpi label="Classes" value={report.counts.classes} />
        <Kpi label="Exams" value={report.counts.exams} />
        <Kpi
          label="Evaluations"
          value={`${report.counts.evaluationsPublished}/${report.counts.evaluationsTotal}`}
          hint="published / total"
        />
        <Kpi
          label="Attendance"
          value={`${report.attendance.attendancePct}%`}
        />
        <Kpi label="Avg exam %" value={`${report.exams.avgScorePct}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance pie */}
        <Card>
          <CardHeader>
            <CardTitle>Overall attendance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {report.attendance.totalMarks === 0 ? (
              <p className="text-sm text-muted-foreground">
                No attendance recorded yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendancePieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {attendancePieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Exam scores bar */}
        <Card>
          <CardHeader>
            <CardTitle>Exam performance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {examChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exam results yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={examChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avg" fill="#3b82f6" name="Avg score" />
                  <Bar dataKey="max" fill="#22c55e" name="Max" />
                  <Bar dataKey="min" fill="#ef4444" name="Min" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Survey feedback</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {report.survey.responseCount === 0 ? (
            <p className="text-muted-foreground">No survey responses yet.</p>
          ) : (
            <>
              <p>
                <span className="text-muted-foreground">Responses:</span>{' '}
                {report.survey.responseCount}
              </p>
              <p>
                <span className="text-muted-foreground">Average rating:</span>{' '}
                <span className="text-lg font-semibold">
                  {report.survey.averageRating?.toFixed(2)} / 5
                </span>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
