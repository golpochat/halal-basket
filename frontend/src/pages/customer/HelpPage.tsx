import { Link } from 'react-router-dom';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LocalePickers } from '../../components/LocalePickers';

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'How much does delivery cost?',
    a: 'Pilot delivery fee is €3.99 for Lucan, Swords, and Tallaght. Pickup from your chosen shop is free. Final fee is always shown before you place the order.',
  },
  {
    q: 'What are the delivery days?',
    a: 'Delivery follows the area calendar (for example Lucan on Tuesday, Swords on Friday, Tallaght on Wednesday). At checkout we show the next available delivery day for your area.',
  },
  {
    q: 'Can I pick up instead?',
    a: 'Yes. Choose pickup at checkout, select a shop in the catalogue, and collect when the shop marks your order ready.',
  },
  {
    q: 'What is your refund policy?',
    a: 'Unopened packaged goods: request within 7 days. Fresh / perishable items: within 1 day of delivery or pickup if quality is not acceptable. Contact support with your order ID; ops records refunds and complaints on the order.',
  },
  {
    q: 'Are products halal?',
    a: 'We list products from participating local shops. Prefer shops and items you trust; platform trust lines emphasise verified shop stock rather than a single warehouse claim.',
  },
  {
    q: 'Do you deliver outside Dublin pilot areas?',
    a: 'Not yet. Only areas on the delivery calendar can place scheduled delivery. Pickup remains available from active shops.',
  },
];

export function HelpPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        variant="site"
        homeTo="/"
        actions={<LocalePickers />}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          Help & FAQ
        </h1>
        <p className="mt-2 text-[var(--hb-ink)]/65">
          Fees, delivery days, pickup, and refunds for the Dublin pilot.
        </p>

        <div className="mt-8 space-y-4">
          {FAQS.map((item) => (
            <section key={item.q} className="hb-surface p-5 shadow-sm">
              <h2 className="font-semibold">{item.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--hb-ink)]/70">
                {item.a}
              </p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-sm text-[var(--hb-ink)]/55">
          Still stuck?{' '}
          <Link to="/customer" className="font-medium text-[var(--hb-green)]">
            Browse the catalogue
          </Link>{' '}
          or sign in and open My orders with your order ID.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
