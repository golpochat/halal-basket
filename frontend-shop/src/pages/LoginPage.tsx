import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  TextInput,
  ToastViewport,
  formatUserFacingError,
  toastError,
} from '@halal-basket/web';
import { PasswordInput } from '../components/ui/PasswordInput';
import { BrandLogo } from '../components/brand/BrandLogo';
import { useAuth } from '../auth/AuthContext';
import { GuestOnly } from '../auth/guards';
import { api, AuthSession, homeForRole } from '../lib/api';

export function LoginPage() {
  return (
    <GuestOnly>
      <LoginForm />
    </GuestOnly>
  );
}

function LoginForm() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (result.user.role !== 'shop') {
        const msg = 'This portal is for shop accounts only.';
        setError(msg);
        toastError(msg);
        return;
      }
      setSession(result);
      const next = params.get('next');
      navigate(next?.startsWith('/') ? next : homeForRole(result.user.role));
    } catch (err) {
      const msg = formatUserFacingError(err, 'Could not sign in');
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[rgba(26,92,58,0.1)] px-4 py-3">
        <BrandLogo size="sm" />
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <form
          onSubmit={onSubmit}
          className="hb-surface w-full max-w-md space-y-5 p-8 shadow-[var(--hb-shadow-sm)]"
        >
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold">Shop portal</h1>
            <p className="text-sm text-[var(--hb-ink)]/65">
              Sign in to manage orders and stock.
            </p>
          </div>
          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label className="block text-sm font-medium">
            Password
            <PasswordInput
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {error && (
            <p className="rounded-[var(--hb-radius)] bg-[var(--hb-error-bg)] px-3 py-2 text-sm text-[var(--hb-error)]">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="w-full py-3" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </main>
      <ToastViewport />
    </div>
  );
}
