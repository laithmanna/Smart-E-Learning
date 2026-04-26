'use client';

import { Download, Printer } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

interface Props {
  excelPath?: string; // e.g. /courses/123/attendance/report.xlsx (without /api prefix)
  excelFileName?: string;
  onPrint?: () => void;
}

export function ReportActions({ excelPath, excelFileName, onPrint }: Props) {
  const [busy, setBusy] = useState(false);

  async function downloadExcel() {
    if (!excelPath) return;
    setBusy(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}${excelPath}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = excelFileName ?? 'report.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2 print:hidden">
      {excelPath && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => void downloadExcel()}
          disabled={busy}
        >
          <Download className="mr-2 h-4 w-4" />
          {busy ? 'Downloading…' : 'Excel'}
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (onPrint) onPrint();
          else window.print();
        }}
      >
        <Printer className="mr-2 h-4 w-4" />
        PDF / Print
      </Button>
    </div>
  );
}
