import { Link } from 'react-router-dom';
import { SiteHeader } from '../components/layout/SiteHeader';
import { SiteFooter } from '../components/layout/SiteFooter';
import { LocalePickers } from '../components/LocalePickers';
import { useAuth } from '../auth/AuthContext';
import { homeForRole } from '../lib/api';

const TRUST = [
  {
    title: 'Trusted halal',
    body: 'Products from local shops you can verify.',
  },
  {
    title: 'Pickup or scheduled delivery',
    body: 'Choose what fits your week — not a false 1-hour promise.',
  },
  {
    title: 'Local shop stock',
    body: 'Ordered from shops that actually hold the item.',
  },
  {
    title: 'Clear fees',
    body: 'Delivery and service costs shown before you pay.',
  },
] as const;

export function LandingPage() {
  const { session } = useAuth();

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        aria-hidden
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%231a5c3a\' fill-opacity=\'0.06\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }}
      />

      <SiteHeader
        variant="site"
        homeTo="/"
        actions={<LocalePickers />}
      />

      <div className="relative z-[1] flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
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
            {session ? (
              <Link
                to={homeForRole(session.user.role)}
                className="hb-btn hb-btn-ghost px-6 py-3.5"
              >
                Go to dashboard
              </Link>
            ) : (
              <Link
                to="/customer/register"
                className="hb-btn hb-btn-ghost px-6 py-3.5"
              >
                Create account
              </Link>
            )}
          </div>
        </section>

        <section className="border-t border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.65)]">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {TRUST.map((item) => (
              <div key={item.title}>
                <h2 className="font-display text-lg font-semibold">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--hb-ink)]/65">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
