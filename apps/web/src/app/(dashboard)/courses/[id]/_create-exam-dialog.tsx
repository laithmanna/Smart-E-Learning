'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Exam, ExamType } from '@/lib/types';

interface Props {
  open: boolean;
  courseId: string;
  onClose: () => void;
  onCreated: (exam: Exam) => void;
}

export function CreateExamDialog({ open, courseId, onClose, onCreated }: Props) {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [totalMarks, setTotalMarks] = useState(100);
  const [examType, setExamType] = useState<ExamType>('MULTIPLE_CHOICE');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setExamName('');
    setExamDate('');
    setTotalMarks(100);
    setExamType('MULTIPLE_CHOICE');
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api<Exam>('/exams', {
        method: 'POST',
        body: {
          courseId,
          examName,
          examDate,
          totalMarks,
          examType,
        },
      });
      onCreated(created);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!submitting) {
          reset();
          onClose();
        }
      }}
      title="New exam"
      description="Add the exam first, then add questions on the next screen."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="examName">Exam name *</Label>
          <Input
            id="examName"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            required
            placeholder="e.g. Midterm, Final, Quiz 1"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="examDate">Exam date *</Label>
            <Input
              id="examDate"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalMarks">Total marks *</Label>
            <Input
              id="totalMarks"
              type="number"
              min={1}
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseInt(e.target.value || '0', 10))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="examType">Type *</Label>
          <Select
            id="examType"
            value={examType}
            onChange={(e) => setExamType(e.target.value as ExamType)}
            required
          >
            <option value="MULTIPLE_CHOICE">Multiple choice (auto-graded)</option>
            <option value="FREE_TEXT">Free text (manually graded)</option>
          </Select>
          <p className="text-xs text-muted-foreground">
            {examType === 'MULTIPLE_CHOICE'
              ? 'Each question has 4 options + correct answer. Students get scored automatically on submit.'
              : 'Students type their answers. Trainer reviews and assigns the final mark per student.'}
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create exam'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
