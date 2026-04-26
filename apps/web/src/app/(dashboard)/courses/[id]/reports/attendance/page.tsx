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

interface AttendanceReport {
  course: { id: string; name: string };
  perStudent: {
    studentId: string;
    name: string;
    email: string;
    present: number;
    absent: number;
    unmarked: number;
    totalClasses: number;
    attendancePct: number;
  }[];
  perClass: {
    classId: string;
    topic: string;
    date: string;
    present: number;
    absent: number;
    unmarked: number;
    totalEnrolled: number;
  }[];
}

const COLORS = ['#22c55e', '#ef4444', '#94a3b8'];

export default function AttendanceReportPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    api<AttendanceReport>(`/courses/${courseId}/reports/attendance`)
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

  const totalPresent = report.perStudent.reduce((a, s) => a + s.present, 0);
  const totalAbsent = report.perStudent.reduce((a, s) => a + s.absent, 0);
  const totalUnmarked = report.perStudent.reduce((a, s) => a + s.unmarked, 0);
  const overallPie = [
    { name: 'Present', value: totalPresent },
    { name: 'Absent', value: totalAbsent },
    { name: 'Unmarked', value: totalUnmarked },
  ];

  const studentBars = report.perStudent.map((s) => ({
    name: s.name.length > 14 ? s.name.slice(0, 12) + '…' : s.name,
    present: s.present,
    absent: s.absent,
    pct: s.attendancePct,
  }));

  const classBars = report.perClass.map((c) => ({
    name: new Date(c.date).toISOString().slice(5, 10),
    present: c.present,
    absent: c.absent,
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
          excelPath={`/courses/${courseId}/attendance/report.xlsx`}
          excelFileName={`attendance-${report.course.name}.xlsx`}
        />
      </div>

      <div>
        <p className="text-xs uppercase text-muted-foreground">Attendance report</p>
        <h1 className="text-2xl font-bold">{report.course.name}</h1>
        <p className="text-sm text-muted-foreground">
          {report.perStudent.length} students · {report.perClass.length} classes
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Overall</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {overallPie.every((p) => p.value === 0) ? (
              <p className="text-sm text-muted-foreground">No attendance yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overallPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {overallPie.map((_, i) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Per class</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={classBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="#22c55e" name="Present" />
                <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Per student</CardTitle>
        </CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={studentBars}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" stackId="a" fill="#22c55e" name="Present" />
              <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Detail</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Student</th>
              <th className="p-3">Email</th>
              <th className="p-3">Present</th>
              <th className="p-3">Absent</th>
              <th className="p-3">Unmarked</th>
              <th className="p-3">Total</th>
              <th className="p-3">%</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {report.perStudent.map((s) => (
              <tr key={s.studentId}>
                <td className="p-3 font-medium">{s.name}</td>
                <td className="p-3 text-muted-foreground">{s.email}</td>
                <td className="p-3">{s.present}</td>
                <td className="p-3">{s.absent}</td>
                <td className="p-3">{s.unmarked}</td>
                <td className="p-3">{s.totalClasses}</td>
                <td className="p-3 font-semibold">{s.attendancePct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
