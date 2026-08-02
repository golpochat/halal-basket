import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { formatUserFacingError, toastError } from '@halal-basket/web';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LocalePickers } from '../../components/LocalePickers';
import { useAuth } from '../../auth/AuthContext';
import { GuestOnly } from '../../auth/guards';
import { api, AuthSession } from '../../lib/api';

function showFormError(message: string) {
  toastError(message);
  return message;
}

export function CustomerRegisterPage() {
  return (
    <GuestOnly>
      <RegisterForm />
    </GuestOnly>
  );
}

function RegisterForm() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function validateStep1() {
    if (name.trim().length < 2) {
      setError(showFormError('Please enter your full name'));
      return false;
    }
    if (!email.includes('@')) {
      setError(showFormError('Enter a valid email'));
      return false;
    }
    setError('');
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError(showFormError('Password must be at least 8 characters'));
      return;
    }
    if (password !== confirm) {
      setError(showFormError('Passwords do not match'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api<AuthSession>('/auth/register-customer', {
        method: 'POST',
        body: JSON.stringify({ email, password, name: name.trim() }),
      });
      setSession(result);
      const next = params.get('next');
      navigate(next?.startsWith('/') ? next : '/');
    } catch (err) {
      const msg = formatUserFacingError(err, 'Registration failed');
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
        onSubmit={
          step === 1
            ? (e) => {
                e.preventDefault();
                if (validateStep1()) setStep(2);
              }
            : onSubmit
        }
        className="hb-surface hb-fade-up w-full max-w-md space-y-5 p-8 shadow-sm"
      >
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-semibold">
            Sign up
          </h1>
          <div className="flex gap-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full ${
                  n <= step ? 'bg-[var(--hb-green)]' : 'bg-[var(--hb-mist)]'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-[var(--hb-ink)]/65">
            {step === 1
              ? 'Step 1 — Your details'
              : 'Step 2 — Choose a secure password'}
          </p>
        </div>

        {step === 1 && (
          <>
            <label className="block text-sm font-medium">
              Full name
              <input
                className="hb-input mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input
                className="hb-input mt-1.5"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <label className="block text-sm font-medium">
              Password
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <span className="mt-1 block text-xs text-[var(--hb-ink)]/50">
                At least 8 characters
              </span>
            </label>
            <label className="block text-sm font-medium">
              Confirm password
              <PasswordInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
          </>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          {step === 2 && (
            <button
              type="button"
              className="hb-btn hb-btn-ghost flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </button>
          )}
          <button
            disabled={loading}
            className="hb-btn hb-btn-primary flex-1 py-3"
          >
            {step === 1
              ? 'Continue'
              : loading
                ? 'Signing up…'
                : 'Sign up'}
          </button>
        </div>

        <p className="text-center text-sm text-[var(--hb-ink)]/55">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-[var(--hb-green)] underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
      <SiteFooter />
    </div>
  );
}
