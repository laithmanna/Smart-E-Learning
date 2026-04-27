'use client';

import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import { useT } from '@/i18n/provider';
import { api } from '@/lib/api';
import type { Role } from '@/lib/types';

interface ProfileResponse {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  emailConfirmed: boolean;
  createdAt: string;
  profile: {
    id: string;
    name: string;
    phone: string | null;
    specialization?: string | null;
    about?: string | null;
  } | null;
}

export default function ProfilePage() {
  const t = useT();
  const { logout } = useAuth();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [about, setAbout] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedAt, setProfileSavedAt] = useState<number | null>(null);

  // Password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  useEffect(() => {
    api<ProfileResponse>('/users/me/profile')
      .then((res) => {
        setProfile(res);
        setName(res.profile?.name ?? '');
        setPhone(res.profile?.phone ?? '');
        setSpecialization(res.profile?.specialization ?? '');
        setAbout(res.profile?.about ?? '');
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      await api('/users/me/profile', {
        method: 'PATCH',
        body: {
          name,
          phone,
          ...(profile?.role === 'TRAINER' ? { specialization, about } : {}),
        },
      });
      setProfileSavedAt(Date.now());
      setTimeout(() => setProfileSavedAt(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingProfile(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwdError(null);
    if (newPwd !== confirmPwd) {
      setPwdError(t('profile.passwordsMustMatch'));
      return;
    }
    setSavingPwd(true);
    try {
      await api('/users/me/password', {
        method: 'PATCH',
        body: { currentPassword: currentPwd, newPassword: newPwd },
      });
      setPwdSuccess(true);
      // Backend revokes refresh tokens; sign user out after a short pause
      setTimeout(() => {
        void logout();
      }, 1500);
    } catch (err) {
      setPwdError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSavingPwd(false);
    }
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }
  if (!profile) {
    return <p className="text-muted-foreground">{t('common.loading')}</p>;
  }

  const isTrainer = profile.role === 'TRAINER';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-[26px]">
          {t('profile.title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('profile.description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Account info */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.accountInfo')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('profile.accountInfoDesc')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSaveProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('common.email')}</Label>
                  <Input id="email" value={profile.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('common.role')}</Label>
                  <Input id="role" value={profile.role} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t('common.fullName')} *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('common.phone')}</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {isTrainer && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">{t('userMgmt.specialization')}</Label>
                    <Input
                      id="specialization"
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="about">{t('userMgmt.about')}</Label>
                    <Textarea
                      id="about"
                      rows={3}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                {profileSavedAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('profile.profileUpdated')}
                  </span>
                )}
                <Button type="submit" disabled={savingProfile} className="ms-auto">
                  {savingProfile ? t('common.saving') : t('common.saveChanges')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.changePassword')}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('profile.changePasswordDesc')}
            </p>
          </CardHeader>
          <CardContent>
            {pwdSuccess ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-sm font-medium">{t('profile.passwordChanged')}</p>
              </div>
            ) : (
              <form onSubmit={onChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPwd">{t('profile.currentPassword')} *</Label>
                  <Input
                    id="currentPwd"
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPwd">{t('profile.newPassword')} *</Label>
                  <Input
                    id="newPwd"
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPwd">{t('profile.confirmNewPassword')} *</Label>
                  <Input
                    id="confirmPwd"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                {pwdError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {pwdError}
                  </p>
                )}

                <Button type="submit" disabled={savingPwd} className="w-full">
                  {savingPwd ? t('common.saving') : t('profile.changePassword')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
