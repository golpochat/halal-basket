import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
      setSession(result);
      const next = params.get('next');
      if (next && next.startsWith('/')) {
        navigate(next);
      } else {
        navigate(homeForRole(result.user.role));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="hb-surface hb-fade-up w-full max-w-md space-y-5 p-8 shadow-sm"
      >
        <div className="space-y-3">
          <BrandLogo size="sm" />
          <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
          <p className="text-sm text-[var(--hb-ink)]/65">
            Sign in with your Halal Basket account. Customers can also{' '}
            <Link
              to="/customer/register"
              className="font-medium text-[var(--hb-green)] underline"
            >
              create an account
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
          <input
            className="hb-input mt-1.5"
            type="password"
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
  );
}
