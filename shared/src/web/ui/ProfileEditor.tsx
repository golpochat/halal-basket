import { FormEvent, useEffect, useRef, useState } from 'react';
import { createApiClient } from '../api/client';
import { toastError, toastSuccess } from '../api/errors';
import { Button } from './Button';
import { TextInput } from './Input';
import { UserAvatar } from './UserAvatar';

export type UserProfile = {
  id: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  name: string | null;
  canEditName: boolean;
  /** Present for customer accounts */
  whatsappOptIn?: boolean;
};

type Props = {
  apiBaseUrl: string;
  accessToken: string;
  onSessionUpdate?: (session: {
    accessToken: string;
    user: {
      id: string;
      email: string;
      role: string;
      avatarUrl?: string | null;
    };
  }) => void;
  /** When provided (customer app), all labels/toasts/errors use profile.* keys. */
  t?: (key: string, vars?: Record<string, string | number>) => string;
};

const MAX_AVATAR_BYTES = 350_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.readAsDataURL(file);
  });
}

export function ProfileEditor({
  apiBaseUrl,
  accessToken,
  onSessionUpdate,
  t,
}: Props) {
  const api = createApiClient(apiBaseUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const msg = (key: string, fallback: string) => (t ? t(key) : fallback);

  useEffect(() => {
    api<UserProfile>('/auth/me', { token: accessToken })
      .then((p) => {
        setProfile(p);
        setEmail(p.email);
        setPhone(p.phone ?? '');
        setName(p.name ?? '');
        setWhatsappOptIn(Boolean(p.whatsappOptIn));
        setAvatarUrl(p.avatarUrl ?? null);
        setLoadFailed(false);
      })
      .catch((e: unknown) => {
        setLoadFailed(true);
        toastError(e, msg('profile.loadToastFailed', 'Could not load your profile'));
      });
  }, [accessToken]);

  async function onPickFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError(
        msg(
          'profile.err.notImage',
          'Please choose an image file (JPG, PNG, or WebP).',
        ),
      );
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toastError(
        msg(
          'profile.err.tooLarge',
          'That image is too large. Please use a photo under 350KB.',
        ),
      );
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatarUrl(dataUrl);
      toastSuccess(
        msg('profile.photoReady', 'Photo ready — save changes to apply it'),
      );
    } catch (e) {
      toastError(e, msg('profile.err.readImage', 'Could not read that image'));
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, string | boolean> = {
        email: email.trim(),
        phone: phone.trim(),
        avatarUrl: avatarUrl ?? '',
      };
      if (profile?.canEditName) body.name = name.trim();
      if (profile?.role === 'customer') {
        body.whatsappOptIn = whatsappOptIn;
      }
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await api<{
        accessToken: string;
        user: {
          id: string;
          email: string;
          role: string;
          avatarUrl?: string | null;
        };
        profile: UserProfile;
      }>('/auth/me', {
        method: 'PATCH',
        token: accessToken,
        body: JSON.stringify(body),
      });
      setProfile(res.profile);
      setEmail(res.profile.email);
      setPhone(res.profile.phone ?? '');
      setName(res.profile.name ?? '');
      setWhatsappOptIn(Boolean(res.profile.whatsappOptIn));
      setAvatarUrl(res.profile.avatarUrl ?? null);
      setCurrentPassword('');
      setNewPassword('');
      onSessionUpdate?.({
        accessToken: res.accessToken,
        user: res.user,
      });
      toastSuccess(msg('profile.saved', 'Profile saved'));
    } catch (err) {
      toastError(err, msg('profile.saveFailed', 'Could not save your profile'));
    } finally {
      setLoading(false);
    }
  }

  if (!profile && !loadFailed) {
    return (
      <p className="text-sm text-[var(--hb-ink)]/55">
        {msg('profile.loading', 'Loading profile…')}
      </p>
    );
  }

  if (!profile && loadFailed) {
    return (
      <p className="text-sm text-[var(--hb-ink)]/55">
        {msg(
          'profile.loadFailed',
          'Could not load profile. Please refresh the page.',
        )}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="hb-surface w-full space-y-5 p-4 shadow-sm sm:p-6"
    >
      <div>
        <h2 className="font-display text-xl font-semibold">
          {msg('profile.heading', 'My Profile')}
        </h2>
        <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
          {msg(
            'profile.subtitle',
            'Update your account details. Role cannot be changed here.',
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[rgba(26,92,58,0.1)] bg-white/50 p-4">
        <UserAvatar label={email || profile?.email} src={avatarUrl} size="lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold">
            {msg('profile.picture', 'Profile picture')}
          </p>
          <p className="text-xs text-[var(--hb-ink)]/50">
            {msg(
              'profile.pictureHint',
              'Optional. Upload an image (max 350KB) or paste an image URL.',
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
              onClick={() => fileRef.current?.click()}
            >
              {msg('profile.upload', 'Upload image')}
            </button>
            {avatarUrl ? (
              <button
                type="button"
                className="hb-btn hb-btn-ghost h-9 px-3 text-sm text-[var(--hb-error)]"
                onClick={() => setAvatarUrl(null)}
              >
                {msg('profile.remove', 'Remove')}
              </button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void onPickFile(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
          <TextInput
            label={msg('profile.imageUrl', 'Or image URL')}
            type="url"
            value={avatarUrl?.startsWith('data:') ? '' : (avatarUrl ?? '')}
            onChange={(e) => setAvatarUrl(e.target.value.trim() || null)}
            placeholder={msg('profile.imageUrlPlaceholder', 'https://…')}
          />
        </div>
      </div>

      <TextInput
        label={msg('profile.email', 'Email')}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {profile?.canEditName ? (
        <TextInput
          label={msg('profile.displayName', 'Display name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      ) : null}

      <TextInput
        label={msg('profile.phone', 'Phone')}
        type="tel"
        autoComplete="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={
          profile?.role === 'customer'
            ? msg('profile.phoneE164', '+353871234567')
            : msg('profile.phoneOptional', 'Optional')
        }
      />

      {profile?.role === 'customer' ? (
        <label className="flex items-start gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--hb-green)]"
            checked={whatsappOptIn}
            onChange={(e) => setWhatsappOptIn(e.target.checked)}
          />
          <span>
            {msg(
              'profile.whatsappOptIn',
              'Send order updates on WhatsApp',
            )}
            <span className="mt-0.5 block text-xs font-normal text-[var(--hb-ink)]/50">
              {msg(
                'profile.whatsappOptInHint',
                'Requires an international phone number (e.g. +353…). You can turn this off anytime.',
              )}
            </span>
          </span>
        </label>
      ) : null}

      <div className="rounded-lg border border-[rgba(26,92,58,0.1)] bg-white/50 p-4">
        <p className="text-sm font-semibold">
          {msg('profile.changePassword', 'Change password')}
        </p>
        <p className="mt-0.5 text-xs text-[var(--hb-ink)]/50">
          {msg(
            'profile.passwordHint',
            'Leave blank to keep your current password.',
          )}
        </p>
        <div className="mt-3 space-y-3">
          <label className="block text-sm font-medium">
            {msg('profile.currentPassword', 'Current password')}
            <input
              className="hb-input mt-1.5"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              minLength={8}
            />
          </label>
          <label className="block text-sm font-medium">
            {msg('profile.newPassword', 'New password')}
            <input
              className="hb-input mt-1.5"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(26,92,58,0.1)] pt-4 text-sm">
        <p className="text-[var(--hb-ink)]/50">
          {msg('profile.role', 'Role:')}{' '}
          <strong className="text-[var(--hb-ink)]/75">
            {profile?.role.replaceAll('_', ' ')}
          </strong>
        </p>
        <Button type="submit" disabled={loading}>
          {loading
            ? msg('profile.saving', 'Saving…')
            : msg('profile.save', 'Save changes')}
        </Button>
      </div>
    </form>
  );
}
