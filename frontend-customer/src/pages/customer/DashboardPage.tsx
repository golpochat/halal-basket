import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function CustomerDashboardPage() {
  const { session } = useAuth();

  return (
    <div>
      <p className="text-sm text-[var(--hb-ink)]/60">
        Welcome{session?.user.email ? `, ${session.user.email}` : ''}. Track
        orders from your account.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          to="/customer/orders"
          className="hb-surface block p-5 shadow-sm transition hover:border-[var(--hb-green)]"
        >
          <h2 className="font-semibold">My orders</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            View status and live updates for your orders.
          </p>
        </Link>
        <Link
          to="/"
          className="hb-surface block p-5 shadow-sm transition hover:border-[var(--hb-green)]"
        >
          <h2 className="font-semibold">Continue shopping</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Browse the Halal Basket catalogue.
          </p>
        </Link>
      </div>
    </div>
  );
}
