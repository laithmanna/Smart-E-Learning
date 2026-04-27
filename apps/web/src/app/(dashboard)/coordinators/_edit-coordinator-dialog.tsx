'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Coordinator } from '@/lib/types';

interface Props {
  coordinator: Coordinator | null;
  onClose: () => void;
  onUpdated: (c: Coordinator) => void;
}

export function EditCoordinatorDialog({ coordinator, onClose, onUpdated }: Props) {
  const t = useT();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (coordinator) {
      setName(coordinator.name);
      setPhone(coordinator.phone ?? '');
      setError(null);
    }
  }, [coordinator]);

  if (!coordinator) {
    return (
      <Dialog open={false} onClose={onClose} title="">
        <></>
      </Dialog>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!coordinator) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await api<Coordinator>(`/coordinators/${coordinator.id}`, {
        method: 'PATCH',
        body: {
          name,
          phone: phone || undefined,
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
      open={!!coordinator}
      onClose={() => !submitting && onClose()}
      title={t('userMgmt.coordinatorEdit')}
      description={coordinator.user.email}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">{t('userMgmt.fullNameLabel')} *</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-phone">{t('common.phone')}</Label>
          <Input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
