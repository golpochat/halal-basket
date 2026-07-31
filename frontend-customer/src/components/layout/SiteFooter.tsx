import { Link } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';
import { useAuth } from '../../auth/AuthContext';
import { homeForRole } from '../../lib/api';

const linkClass =
  'block rounded-lg py-2 text-sm text-[var(--hb-ink)]/70 transition hover:text-[var(--hb-green)]';

export function SiteFooter() {
  const { session } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto w-full shrink-0 border-t border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.75)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <BrandLogo size="sm" />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--hb-ink)]/60">
            Halal groceries from trusted local shops — pickup or scheduled
            delivery across the Dublin pilot.
          </p>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
            Shop
          </h2>
          <ul className="mt-3 space-y-0.5">
            <li>
              <Link to="/" className={linkClass}>
                Catalogue
              </Link>
            </li>
            <li>
              <Link to="/help" className={linkClass}>
                Help & FAQ
              </Link>
            </li>
            <li>
              <Link to="/register" className={linkClass}>
                Create account
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
            Account
          </h2>
          <ul className="mt-3 space-y-0.5">
            {session ? (
              <>
                <li>
                  <Link
                    to={homeForRole(session.user.role)}
                    className={linkClass}
                  >
                    Dashboard
                  </Link>
                </li>
                {session.user.role === 'customer' && (
                  <li>
                    <Link to="/orders" className={linkClass}>
                      My orders
                    </Link>
                  </li>
                )}
              </>
            ) : (
              <li>
                <Link to="/login" className={linkClass}>
                  Sign in
                </Link>
              </li>
            )}
            <li>
              <Link to="/help" className={linkClass}>
                Fees & refunds
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
            Operations
          </h2>
          <ul className="mt-3 space-y-0.5">
            <li>
              <Link to="/login" className={linkClass}>
                Staff login
              </Link>
            </li>
            <li>
              <Link to="/help" className={linkClass}>
                Delivery areas
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[rgba(26,92,58,0.08)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-[var(--hb-ink)]/45 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {year} Halal Basket</p>
          <p>Dublin pilot · Lucan · Swords · Tallaght</p>
        </div>
      </div>
    </footer>
  );
}
