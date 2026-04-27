'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Trainer } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (t: Trainer) => void;
}

export function CreateTrainerDialog({ open, onClose, onCreated }: Props) {
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [about, setAbout] = useState('');
  const [password, setPassword] = useState('Trainer@123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setName('');
    setEmail('');
    setPhone('');
    setSpecialization('');
    setAbout('');
    setPassword('Trainer@123');
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api<Trainer>('/trainers', {
        method: 'POST',
        body: {
          name,
          email,
          password,
          ...(phone ? { phone } : {}),
          ...(specialization ? { specialization } : {}),
          ...(about ? { about } : {}),
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
      title={t('userMgmt.trainerCreate')}
      description={t('userMgmt.trainerCreateDesc')}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('userMgmt.fullNameLabel')} *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('common.email')} *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t('common.phone')}</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialization">{t('userMgmt.specialization')}</Label>
          <Input
            id="specialization"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder={t('userMgmt.specializationPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="about">{t('userMgmt.about')}</Label>
          <Textarea
            id="about"
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            rows={3}
            placeholder={t('userMgmt.aboutPlaceholder')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('userMgmt.initialPassword')} *</Label>
          <Input
            id="password"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          <p className="text-xs text-muted-foreground">
            {t('userMgmt.initialPasswordHelp')}
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
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('common.creating') : t('userMgmt.trainerCreating')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
