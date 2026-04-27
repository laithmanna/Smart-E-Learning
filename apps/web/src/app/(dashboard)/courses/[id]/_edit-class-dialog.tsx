'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { CourseClass } from '@/lib/types';

interface Props {
  klass: CourseClass | null;
  onClose: () => void;
  onUpdated: (klass: CourseClass) => void;
}

const PLACEHOLDER = 'NaN'; // legacy default written by auto-class generation

function clean(v: string | null | undefined): string {
  if (!v) return '';
  if (v === PLACEHOLDER) return '';
  return v;
}

export function EditClassDialog({ klass, onClose, onUpdated }: Props) {
  const t = useT();
  const [topic, setTopic] = useState('');
  const [classDate, setClassDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (klass) {
      setTopic(klass.topic);
      setClassDate(klass.classDate.slice(0, 10));
      setStartTime(klass.startTime);
      setEndTime(klass.endTime);
      setLocation(clean(klass.location));
      setMeetingLink(clean(klass.meetingLink));
      setError(null);
    }
  }, [klass]);

  if (!klass) {
    return (
      <Dialog open={false} onClose={onClose} title="">
        <></>
      </Dialog>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!klass) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api<CourseClass>(`/classes/${klass.id}`, {
        method: 'PATCH',
        body: {
          topic,
          classDate,
          startTime,
          endTime,
          location: location || PLACEHOLDER,
          meetingLink: meetingLink || PLACEHOLDER,
        },
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={!!klass}
      onClose={() => !submitting && onClose()}
      title={t('classes.editClass')}
      description={klass.topic}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="topic">{t('classes.topic')} *</Label>
          <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="classDate">{t('classes.date')} *</Label>
          <Input
            id="classDate"
            type="date"
            value={classDate}
            onChange={(e) => setClassDate(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startTime">{t('classes.startTime')} *</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime">{t('classes.endTime')} *</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">{t('classes.location')}</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. HQ - Building A, Room 201"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meetingLink">{t('classes.meetingLink')}</Label>
          <Input
            id="meetingLink"
            type="url"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://meet.example.com/abc"
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.saveChanges')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
