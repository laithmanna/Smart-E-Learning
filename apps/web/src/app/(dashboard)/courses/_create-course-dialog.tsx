'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { Course } from '@/lib/types';

interface OptionRow {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (course: Course) => void;
}

export function CreateCourseDialog({ open, onClose, onCreated }: Props) {
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
    Promise.allSettled([
      api<OptionRow[]>('/trainers'),
      api<OptionRow[]>('/coordinators'),
      api<OptionRow[]>('/clients'),
    ]).then(([t, c, cl]) => {
      if (t.status === 'fulfilled') setTrainers(t.value);
      if (c.status === 'fulfilled') setCoordinators(c.value);
      if (cl.status === 'fulfilled') setClients(cl.value);
    });
  }, [open]);

  function reset() {
    setCourseName('');
    setProjectName('');
    setStartDate('');
    setEndDate('');
    setLocation('');
    setDescription('');
    setTrainerId('');
    setCoordinatorId('');
    setClientId('');
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api<Course>('/courses', {
        method: 'POST',
        body: {
          courseName,
          ...(projectName ? { projectName } : {}),
          startDate,
          endDate,
          ...(location ? { location } : {}),
          ...(description ? { description } : {}),
          ...(trainerId ? { trainerId } : {}),
          ...(coordinatorId ? { coordinatorId } : {}),
          ...(clientId ? { clientId } : {}),
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
      title="New course"
      description="Classes will auto-generate Mon-Thu + Sun, skipping Friday & Saturday."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="courseName">Course name *</Label>
          <Input
            id="courseName"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectName">Project name</Label>
          <Input
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Optional"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start date *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End date *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. HQ, Building A"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="trainer">Trainer</Label>
          <Select
            id="trainer"
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
          <Label htmlFor="coordinator">Coordinator</Label>
          <Select
            id="coordinator"
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
          <Label htmlFor="client">Client</Label>
          <Select
            id="client"
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
            {submitting ? 'Creating…' : 'Create course'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
