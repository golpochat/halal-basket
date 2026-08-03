import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';

type DashSection = 'platform' | 'work';

type Card = {
  title: string;
  body: string;
  path: string;
  permission?: string;
  /** Platform = governance / identity. Work = day-to-day operations. */
  section: DashSection;
  /** Only for portal super_admin (APIs are PLATFORM-gated). */
  superOnly?: boolean;
};

/**
 * Card order matches sidebar primary/secondary lists in AdminLayout.
 */
const CARDS: Card[] = [
  // —— Platform ——
  {
    title: 'Roles & permissions',
    body: 'Create staff roles, assign permissions, then attach roles to admins.',
    path: '/roles',
    permission: 'roles.read',
    section: 'platform',
  },
  {
    title: 'Admin users',
    body: 'Create admin accounts and assign their staff role.',
    path: '/users',
    section: 'platform',
    superOnly: true,
  },
  {
    title: 'Shop logins',
    body: 'Shop portal logins linked to partner stores.',
    path: '/shop-users',
    section: 'platform',
    superOnly: true,
  },
  {
    title: 'Driver logins',
    body: 'Driver portal accounts for delivery fulfillment.',
    path: '/drivers',
    section: 'platform',
    superOnly: true,
  },
  {
    title: 'Warehouses',
    body: 'Configure warehouses used for fulfillment planning.',
    path: '/warehouse',
    permission: 'warehouses.read',
    section: 'platform',
  },
  {
    title: 'Branding',
    body: 'Customer-app hero and storefront identity.',
    path: '/branding',
    permission: 'branding.read',
    section: 'platform',
  },
  {
    title: 'Featured categories',
    body: 'Curate Popular categories on the customer homepage.',
    path: '/featured',
    permission: 'branding.read',
    section: 'platform',
  },
  {
    title: 'Legal pages',
    body: 'Privacy, terms, cookies, refunds — publish storefront policies.',
    path: '/legal',
    permission: 'legal.read',
    section: 'platform',
  },
  {
    title: 'Privacy',
    body: 'Customer data export and erasure tools.',
    path: '/gdpr',
    permission: 'gdpr.read',
    section: 'platform',
  },
  {
    title: 'Alert drill',
    body: 'Runtime process metrics and alert wiring checks.',
    path: '/ops-drill',
    section: 'platform',
    superOnly: true,
  },

  // —— Day-to-day work ——
  {
    title: 'Ops',
    body: 'Order lookup, refunds, complaints, and customer blocks.',
    path: '/ops',
    permission: 'ops.read',
    section: 'work',
  },
  {
    title: 'Analytics',
    body: 'Orders, revenue, delivery rate, and trust signals.',
    path: '/analytics',
    permission: 'analytics.read',
    section: 'work',
  },
  {
    title: 'Partner shops',
    body: 'Shop overviews — fulfillments, payments, and attributed GMV.',
    path: '/shops',
    permission: 'shops.read',
    section: 'work',
  },
  {
    title: 'Catalogue',
    body: 'Import and maintain the product catalogue.',
    path: '/catalogue',
    permission: 'catalogue.read',
    section: 'work',
  },
  {
    title: 'Driver activity',
    body: 'Driver overviews — jobs, delivery rate, and related payments.',
    path: '/driver-activity',
    permission: 'drivers.read',
    section: 'work',
  },
  {
    title: 'Location & fees',
    body: 'Delivery areas, days, and scheduled fees.',
    path: '/delivery-fees',
    permission: 'locations.read',
    section: 'work',
  },
  {
    title: 'Promotions',
    body: 'Cart banner and coupon codes (shown in the customer cart).',
    path: '/promotions',
    permission: 'promotions.read',
    section: 'work',
  },
  {
    title: 'Currencies',
    body: 'Published currencies and exchange rates.',
    path: '/currencies',
    permission: 'currencies.read',
    section: 'work',
  },
  {
    title: 'Languages',
    body: 'Published storefront languages (locale metadata; full UI translations not shipped yet).',
    path: '/languages',
    permission: 'languages.read',
    section: 'work',
  },
];

export function AdminDashboardPage() {
  const { session } = useAuth();
  const isSuper = session?.user.role === 'super_admin';
  const base = isSuper ? '/super-admin' : '/admin';
  const permissions = session?.permissions ?? [];
  const roleName = session?.staffRole?.name;
  const can = (c: Card) => {
    if (c.superOnly && !isSuper) return false;
    return isSuper || !c.permission || permissions.includes(c.permission);
  };

  const visible = CARDS.filter((c) => can(c));
  const platform = visible.filter((c) => c.section === 'platform');
  const work = visible.filter((c) => c.section === 'work');

  if (isSuper) {
    return (
      <div>
        <p className="text-sm text-[var(--hb-ink)]/60">
          Platform control — access, accounts, branding, and privacy. Staff
          day-to-day tools (ops, catalogue, fees, promotions, locales) live under{' '}
          <Link
            to={`${base}/roles`}
            className="font-medium text-[var(--hb-green)] hover:underline"
          >
            Roles & permissions
          </Link>
          . Use <span className="font-medium">Show operations</span> in the
          sidebar when you need those tools.
        </p>

        <Section
          title="Platform"
          subtitle="Governance, accounts, and storefront controls."
        >
          {platform.map((c) => (
            <DashCard
              key={c.path}
              title={c.title}
              body={c.body}
              to={`${base}${c.path}`}
            />
          ))}
        </Section>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-[var(--hb-ink)]/60">
        {roleName
          ? `Your work as ${roleName} — day-to-day tools stay in the sidebar.`
          : 'Staff overview — access is based on your assigned role permissions.'}{' '}
        {platform.length > 0
          ? 'Use Show platform tools in the sidebar when you need governance pages.'
          : null}
      </p>

      {work.length > 0 ? (
        <Section title="Your work" className="mt-6">
          {work.map((c) => (
            <DashCard
              key={c.path}
              title={c.title}
              body={c.body}
              to={`${base}${c.path}`}
            />
          ))}
        </Section>
      ) : null}

      {platform.length > 0 ? (
        <Section
          title="Also available"
          subtitle="Extra permissions on your role."
          className="mt-8"
        >
          {platform.map((c) => (
            <DashCard
              key={c.path}
              title={c.title}
              body={c.body}
              to={`${base}${c.path}`}
            />
          ))}
        </Section>
      ) : null}

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--hb-ink)]/55">
          No areas assigned yet. Ask a super admin to attach a staff role under
          Admin users.
        </p>
      ) : null}
    </div>
  );
}

function Section({
  title,
  subtitle,
  className = 'mt-6',
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <h2 className="font-semibold text-[var(--hb-ink)]">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 text-sm text-[var(--hb-ink)]/50">{subtitle}</p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
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
      <h3 className="font-semibold text-[var(--hb-ink)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--hb-ink)]/55">{body}</p>
    </Link>
  );
}
