import { Link } from 'react-router-dom';
import { InfoPageShell } from '../../components/layout/InfoPageShell';

export function TermsPage() {
  return (
    <InfoPageShell
      title="Terms of service"
      subtitle="Terms for using Halal Basket during the Dublin pilot."
    >
      <div className="space-y-8 text-sm leading-relaxed text-[var(--hb-ink)]/75">
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--hb-ink)]">
            The service
          </h2>
          <p className="mt-2">
            Halal Basket connects you with participating local shops for pickup
            or scheduled delivery in pilot areas. Product availability and
            prices are set by each shop and may change.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--hb-ink)]">
            Orders & fulfilment
          </h2>
          <p className="mt-2">
            Placing an order is an offer to buy. Shops may accept, adjust, or
            decline items that are unavailable. Delivery fees and pickup options
            are shown at checkout — see{' '}
            <Link
              to="/delivery-locations"
              className="font-semibold text-[var(--hb-green)]"
            >
              Delivery locations
            </Link>{' '}
            and{' '}
            <Link
              to="/delivery-charges"
              className="font-semibold text-[var(--hb-green)]"
            >
              Delivery charges
            </Link>
            .
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--hb-ink)]">
            Acceptable use
          </h2>
          <p className="mt-2">
            You must provide accurate account and delivery details, keep your
            login secure, and not misuse the platform. We may suspend accounts
            that abuse the service or breach these terms.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--hb-ink)]">
            Changes
          </h2>
          <p className="mt-2">
            These pilot terms may be updated as Halal Basket develops. Continued
            use after changes means you accept the updated terms. For questions,
            see the{' '}
            <Link to="/faq" className="font-semibold text-[var(--hb-green)]">
              FAQ
            </Link>
            .
          </p>
        </section>
      </div>
    </InfoPageShell>
  );
}
