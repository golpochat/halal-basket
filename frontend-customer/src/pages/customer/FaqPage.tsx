import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InfoPageShell } from '../../components/layout/InfoPageShell';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';
import { type DeliveryFeeConfig } from '../../lib/delivery-fee';

function titleCaseDay(day: string) {
  if (!day) return day;
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

export function FaqPage() {
  const { formatMoney } = useLocale();
  const [config, setConfig] = useState<DeliveryFeeConfig | null>(null);

  useEffect(() => {
    api<DeliveryFeeConfig>('/platform/delivery-config')
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  const areaSummary =
    config && config.areas && config.areas.length > 0
      ? config.areas
          .map(
            (a) =>
              `${a.areaName} on ${(a.deliveryDays ?? []).map(titleCaseDay).join('/')}`,
          )
          .join('; ')
      : 'your selected area';

  const freeOver = config?.freeDeliveryOverAmount ?? 0;
  const deliveryFeeLabel = config
    ? formatMoney(config.scheduledDeliveryFee).toLowerCase()
    : 'the fee shown on Delivery charges';
  const pickupFeeLabel = config
    ? formatMoney(config.pickupFee).toLowerCase()
    : 'as listed on Delivery charges';
  const freeOverClause =
    freeOver > 0
      ? ` Free scheduled delivery applies when your items subtotal is ${formatMoney(freeOver)} or more.`
      : '';
  const areaFeeNote =
    config?.areas?.some(
      (a) =>
        a.deliveryFee != null &&
        a.deliveryFee !== config.scheduledDeliveryFee,
    )
      ? ' Some areas have their own fee — see Delivery charges.'
      : '';

  const faqs: Array<{ q: string; a: string }> = [
    {
      q: 'How much does delivery cost?',
      a: `Default scheduled delivery is ${deliveryFeeLabel}. Pickup is ${pickupFeeLabel}.${freeOverClause}${areaFeeNote} Final fee is always shown before you place the order.`,
    },
    {
      q: 'What are the delivery days?',
      a: `Delivery follows the area calendar (for example ${areaSummary}). At checkout we show the next available delivery day for your area.`,
    },
    {
      q: 'Can I pick up instead?',
      a: 'Yes. Choose pickup at checkout, select your collection area, and collect from the Halal Basket pickup location shown after you place the order.',
    },
    {
      q: 'What is your refund policy?',
      a: 'Unopened packaged goods: request within 7 days. Fresh / perishable items: within 1 day of delivery or pickup if quality is not acceptable. Contact support with your order ID; ops records refunds and complaints on the order.',
    },
    {
      q: 'Are products halal?',
      a: 'Yes. Everything on Halal Basket is Halal — that is the platform standard, not a per-product claim. We list stock from participating local shops that meet that requirement.',
    },
    {
      q: 'Do you deliver outside Dublin pilot areas?',
      a: 'Not yet. Only areas on the delivery calendar can place scheduled delivery. Pickup remains available where offered.',
    },
  ];

  return (
    <InfoPageShell
      title="FAQ"
      subtitle="Fees, delivery days, pickup, and refunds for the Dublin pilot."
    >
      <div className="space-y-4">
        {faqs.map((item) => (
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
        <Link to="/" className="font-medium text-[var(--hb-green)]">
          Shop now
        </Link>{' '}
        or{' '}
        <Link to="/login" className="font-medium text-[var(--hb-green)]">
          Sign in
        </Link>{' '}
        and open My orders with your order ID. You can also read{' '}
        <Link
          to="/delivery-locations"
          className="font-medium text-[var(--hb-green)]"
        >
          Delivery locations
        </Link>{' '}
        and{' '}
        <Link
          to="/delivery-charges"
          className="font-medium text-[var(--hb-green)]"
        >
          Delivery charges
        </Link>
        .
      </p>
    </InfoPageShell>
  );
}
