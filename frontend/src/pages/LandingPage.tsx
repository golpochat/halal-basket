import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/brand/BrandLogo';
import { useAuth } from '../auth/AuthContext';
import { homeForRole } from '../lib/api';

export function LandingPage() {
  const { session } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%231a5c3a\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <BrandLogo size="md" />
        <div className="flex gap-2">
          {session ? (
            <Link
              to={homeForRole(session.user.role)}
              className="hb-btn hb-btn-primary text-sm"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="hb-btn hb-btn-ghost text-sm">
                Staff login
              </Link>
              <Link to="/customer" className="hb-btn hb-btn-primary text-sm">
                Shop now
              </Link>
            </>
          )}
        </div>
      </header>
      <section className="relative mx-auto flex max-w-6xl flex-col justify-center px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <p className="hb-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-[var(--hb-green)]">
          Dublin delivery & pickup
        </p>
        <h1 className="hb-fade-up font-display mt-4 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Halal Basket
        </h1>
        <p className="hb-fade-up-delay mt-5 max-w-xl text-lg text-[var(--hb-ink)]/70">
          Fresh halal groceries from trusted local shops — scheduled to your
          area or ready for pickup.
        </p>
        <div className="hb-fade-up-delay mt-8 flex flex-wrap gap-3">
          <Link to="/customer" className="hb-btn hb-btn-primary px-6 py-3.5">
            Browse catalogue
          </Link>
          <Link
            to="/customer/register"
            className="hb-btn hb-btn-ghost px-6 py-3.5"
          >
            Create account
          </Link>
        </div>
      </section>
    </div>
  );
}
