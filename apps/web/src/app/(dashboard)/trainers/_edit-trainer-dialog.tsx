'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import type { Trainer } from '@/lib/types';
import { uploadUrl } from '@/lib/utils';

interface Props {
  trainer: Trainer | null;
  onClose: () => void;
  onUpdated: (t: Trainer) => void;
}

export function EditTrainerDialog({ trainer, onClose, onUpdated }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [about, setAbout] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const [cvBusy, setCvBusy] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (trainer) {
      setName(trainer.name);
      setPhone(trainer.phone ?? '');
      setSpecialization(trainer.specialization ?? '');
      setAbout(trainer.about ?? '');
      setError(null);
    }
  }, [trainer]);

  if (!trainer) {
    return (
      <Dialog open={false} onClose={onClose} title="">
        <></>
      </Dialog>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trainer) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api<Trainer>(`/trainers/${trainer.id}`, {
        method: 'PATCH',
        body: {
          name,
          phone: phone || undefined,
          specialization: specialization || undefined,
          about: about || undefined,
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

  async function uploadFile(kind: 'photo' | 'cv', file: File) {
    if (!trainer) return;
    const setBusy = kind === 'photo' ? setPhotoBusy : setCvBusy;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const updated = await api<Trainer>(`/trainers/${trainer.id}/${kind}`, {
        method: 'POST',
        body: fd,
      });
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (kind === 'photo' && photoInputRef.current) photoInputRef.current.value = '';
      if (kind === 'cv' && cvInputRef.current) cvInputRef.current.value = '';
    }
  }

  const photoSrc = uploadUrl(trainer.photoPath);
  const cvSrc = uploadUrl(trainer.cvPath);

  return (
    <Dialog
      open={!!trainer}
      onClose={() => !submitting && !photoBusy && !cvBusy && onClose()}
      title="Edit trainer"
      description={trainer.user.email}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Full name *</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-phone">Phone</Label>
          <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-spec">Specialization</Label>
          <Input
            id="edit-spec"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-about">About</Label>
          <Textarea
            id="edit-about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={3}
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <div className="mt-6 space-y-4 border-t pt-6">
        <div>
          <h3 className="text-sm font-semibold">Photo</h3>
          <p className="text-xs text-muted-foreground">PNG / JPEG / WebP, max 5 MB</p>
        </div>
        <div className="flex items-center gap-4">
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt="Trainer"
              className="h-16 w-16 rounded-md border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
              none
            </div>
          )}
          <Input
            ref={photoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={photoBusy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile('photo', f);
            }}
          />
          {photoBusy && <span className="text-xs text-muted-foreground">Uploading…</span>}
        </div>
      </div>

      <div className="mt-4 space-y-4 border-t pt-6">
        <div>
          <h3 className="text-sm font-semibold">CV</h3>
          <p className="text-xs text-muted-foreground">PDF only, max 10 MB</p>
        </div>
        <div className="flex items-center gap-4">
          {cvSrc ? (
            <a
              href={cvSrc}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              View current CV
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">No CV uploaded</span>
          )}
          <Input
            ref={cvInputRef}
            type="file"
            accept="application/pdf"
            disabled={cvBusy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile('cv', f);
            }}
          />
          {cvBusy && <span className="text-xs text-muted-foreground">Uploading…</span>}
        </div>
      </div>
    </Dialog>
  );
}
