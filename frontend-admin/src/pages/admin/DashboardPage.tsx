import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export function AdminDashboardPage() {
  const { session } = useAuth();
  const isSuper = session?.user.role === 'super_admin';
  const base = isSuper ? '/super-admin' : '/admin';

  return (
    <div>
      <p className="text-sm text-[var(--hb-ink)]/60">
        {isSuper
          ? 'Platform overview — manage ops, catalogue, and settings.'
          : 'Ops overview — look up orders and manage customer risk.'}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard
          title="Ops"
          body="Order lookup, refunds, complaints, and customer blocks."
          to={`${base}/ops`}
        />
        {isSuper && (
          <>
            <DashCard
              title="Analytics"
              body="Orders, revenue, delivery rate, and trust signals."
              to={`${base}/analytics`}
            />
            <DashCard
              title="Shops & users"
              body="Create shops and invite shop, driver, or admin users."
              to={`${base}/shops`}
            />
            <DashCard
              title="Delivery"
              body="Fees, calendar areas, and warehouse fulfillment."
              to={`${base}/delivery-fees`}
            />
            <DashCard
              title="Promotions"
              body="Cart banner and coupon codes."
              to={`${base}/promotions`}
            />
            <DashCard
              title="Locales"
              body="Published currencies and languages."
              to={`${base}/currencies`}
            />
          </>
        )}
      </div>
    </div>
  );
}

function DashCard({
  title,
  body,
  to,
}: {
  title: string;
  body: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="hb-surface block p-5 shadow-sm transition hover:border-[var(--hb-dash-accent)]"
    >
      <h2 className="font-semibold text-[var(--hb-ink)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--hb-ink)]/55">{body}</p>
    </Link>
  );
}
