import { Link } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';

export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto w-full shrink-0 border-t border-[rgba(26,92,58,0.1)] bg-[rgba(247,250,246,0.9)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
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
          <ul className="mt-3 space-y-2 text-sm text-[var(--hb-ink)]/70">
            <li>
              <Link to="/" className="hover:text-[var(--hb-green)]">
                Catalogue
              </Link>
            </li>
            <li>
              <Link to="/help" className="hover:text-[var(--hb-green)]">
                Help & FAQ
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-[var(--hb-green)]">
                Create account
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
            Account
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--hb-ink)]/70">
            <li>
              <Link to="/login" className="hover:text-[var(--hb-green)]">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-[var(--hb-green)]">
                My orders
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
            Areas
          </h2>
          <p className="mt-3 text-sm text-[var(--hb-ink)]/70">
            Lucan · Swords · Tallaght
          </p>
        </div>
      </div>

      <div className="border-t border-[rgba(26,92,58,0.1)] bg-[rgba(19,38,28,0.04)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 text-xs text-[var(--hb-ink)]/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {year} Halal Basket. All rights reserved.</p>
          <p>Dublin pilot · Ireland</p>
        </div>
      </div>
    </footer>
  );
}
