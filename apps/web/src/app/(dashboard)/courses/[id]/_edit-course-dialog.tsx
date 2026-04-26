'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { CourseDetail } from '@/lib/types';

interface OptionRow {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  course: CourseDetail;
  onClose: () => void;
  onUpdated: (course: CourseDetail) => void;
}

export function EditCourseDialog({ open, course, onClose, onUpdated }: Props) {
  const [trainers, setTrainers] = useState<OptionRow[]>([]);
  const [coordinators, setCoordinators] = useState<OptionRow[]>([]);
  const [clients, setClients] = useState<OptionRow[]>([]);

  const [courseName, setCourseName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [coordinatorId, setCoordinatorId] = useState('');
  const [clientId, setClientId] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCourseName(course.courseName);
    setProjectName(course.projectName ?? '');
    setStartDate(course.startDate.slice(0, 10));
    setEndDate(course.endDate.slice(0, 10));
    setLocation(course.location ?? '');
    setDescription(course.description ?? '');
    setTrainerId(course.trainerId ?? '');
    setCoordinatorId(course.coordinatorId ?? '');
    setClientId(course.clientId ?? '');
    setError(null);

    Promise.allSettled([
      api<OptionRow[]>('/trainers'),
      api<OptionRow[]>('/coordinators'),
      api<OptionRow[]>('/clients'),
    ]).then(([t, c, cl]) => {
      if (t.status === 'fulfilled') setTrainers(t.value);
      if (c.status === 'fulfilled') setCoordinators(c.value);
      if (cl.status === 'fulfilled') setClients(cl.value);
    });
  }, [open, course]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api<CourseDetail>(`/courses/${course.id}`, {
        method: 'PATCH',
        body: {
          courseName,
          projectName: projectName || undefined,
          startDate,
          endDate,
          location: location || undefined,
          description: description || undefined,
          trainerId: trainerId || undefined,
          coordinatorId: coordinatorId || undefined,
          clientId: clientId || undefined,
        },
      });
      // PATCH response doesn't include classes/attachments — preserve existing
      onUpdated({
        ...course,
        ...updated,
        classes: course.classes,
        attachments: course.attachments,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose()}
      title="Edit course"
      description="Note: changing dates does NOT regenerate the class schedule — edit individual classes from the Classes tab."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-courseName">Course name *</Label>
          <Input
            id="edit-courseName"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-projectName">Project name</Label>
          <Input
            id="edit-projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-startDate">Start date *</Label>
            <Input
              id="edit-startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-endDate">End date *</Label>
            <Input
              id="edit-endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-location">Location</Label>
          <Input
            id="edit-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-trainer">Trainer</Label>
          <Select
            id="edit-trainer"
            value={trainerId}
            onChange={(e) => setTrainerId(e.target.value)}
          >
            <option value="">— none —</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-coordinator">Coordinator</Label>
          <Select
            id="edit-coordinator"
            value={coordinatorId}
            onChange={(e) => setCoordinatorId(e.target.value)}
          >
            <option value="">— none —</option>
            {coordinators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-client">Client</Label>
          <Select
            id="edit-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">— none —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
