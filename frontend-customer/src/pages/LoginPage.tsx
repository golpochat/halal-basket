import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PasswordInput } from '../components/ui/PasswordInput';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { LocalePickers } from '../components/LocalePickers';
import { useAuth } from '../auth/AuthContext';
import { GuestOnly } from '../auth/guards';
import { formatUserFacingError, toastError } from '@halal-basket/web';
import {
  api,
  AuthSession,
  authHandoffUrl,
  homeForRole,
  isExternalHome,
} from '../lib/api';

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
      const next = params.get('next');
      const dest =
        next && next.startsWith('/')
          ? next
          : homeForRole(result.user.role);

      if (isExternalHome(dest)) {
        window.location.assign(authHandoffUrl(dest, result));
        return;
      }

      setSession(result);
      navigate(dest);
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
      <SiteHeader
        variant="slim"
        homeTo="/"
        actions={<LocalePickers />}
        showAuth={false}
      />
      <main className="flex flex-1 items-center justify-center p-4">
        <form
          onSubmit={onSubmit}
          className="hb-surface hb-fade-up w-full max-w-md space-y-5 p-8 shadow-sm"
        >
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
            <p className="text-sm text-[var(--hb-ink)]/65">
              Sign in with your Halal Basket account. Customers can also{' '}
              <Link
                to="/register"
                className="font-medium text-[var(--hb-green)] underline"
              >
                Sign up
              </Link>
              .
            </p>
          </div>
          <label className="block text-sm font-medium">
            Email
            <input
              className="hb-input mt-1.5"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
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
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="hb-btn hb-btn-primary w-full py-3"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-sm text-[var(--hb-ink)]/55">
            <Link to="/">← Back home</Link>
          </p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
