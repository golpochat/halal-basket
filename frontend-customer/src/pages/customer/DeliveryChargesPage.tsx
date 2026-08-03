import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toastError } from '@halal-basket/web';
import { InfoPageShell } from '../../components/layout/InfoPageShell';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';
import { type DeliveryFeeConfig } from '../../lib/delivery-fee';

export function DeliveryChargesPage() {
  const { formatMoney } = useLocale();
  const [config, setConfig] = useState<DeliveryFeeConfig | null>(null);

  useEffect(() => {
    api<DeliveryFeeConfig>('/platform/delivery-config')
      .then(setConfig)
      .catch((e) => toastError(e, 'Could not load delivery charges'));
  }, []);

  const areaRows = useMemo(() => {
    if (!config?.areas?.length) return [];
    return config.areas.map((a) => ({
      name: a.areaName,
      fee: a.deliveryFee ?? config.scheduledDeliveryFee,
    }));
  }, [config]);

  const freeOver = config?.freeDeliveryOverAmount ?? 0;

  return (
    <InfoPageShell
      wide
      title="Delivery charges"
      subtitle="Live Halal Basket fees from platform settings. Confirmed again at checkout."
    >
      {!config && (
        <p className="text-sm text-[var(--hb-ink)]/55">Loading charges…</p>
      )}

      {config && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.12)] bg-white/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                Default scheduled delivery
              </p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--hb-green)]">
                {formatMoney(config.scheduledDeliveryFee)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--hb-ink)]/65">
                Used when an area has no custom fee. Your checkout total uses
                your area and basket subtotal.
              </p>
            </div>
            <div className="rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.12)] bg-white/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                Pickup
              </p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--hb-green)]">
                {formatMoney(config.pickupFee)}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--hb-ink)]/65">
                Collect from your Halal Basket pickup location when the order is
                marked ready.
              </p>
            </div>
          </div>

          {freeOver > 0 && (
            <p className="mt-6 rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.12)] bg-white/80 px-5 py-4 text-sm text-[var(--hb-ink)]/75">
              Free scheduled delivery on orders of{' '}
              <strong>{formatMoney(freeOver)}</strong> or more (items subtotal).
            </p>
          )}

          {areaRows.length > 0 && (
            <div className="mt-8 overflow-hidden rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.12)] bg-white/80">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Delivery fee by area</caption>
                <thead className="bg-[var(--hb-mist)] text-[var(--hb-ink)]/55">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                      Area
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                      Scheduled fee
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {areaRows.map((row, i) => (
                    <tr
                      key={row.name}
                      className={
                        i < areaRows.length - 1
                          ? 'border-b border-[rgba(26,92,58,0.08)]'
                          : undefined
                      }
                    >
                      <td className="px-4 py-3 font-medium sm:px-5">
                        {row.name}
                      </td>
                      <td className="px-4 py-3 sm:px-5">
                        {formatMoney(row.fee)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className="mt-12 flex flex-col gap-4 border-t border-[rgba(26,92,58,0.1)] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--hb-ink)]/55">
          Check{' '}
          <Link
            to="/delivery-locations"
            className="font-semibold text-[var(--hb-green)]"
          >
            Delivery locations
          </Link>
          . Refunds are covered in the{' '}
          <Link to="/faq" className="font-semibold text-[var(--hb-green)]">
            FAQ
          </Link>
          .
        </p>
        <Link to="/" className="hb-btn hb-btn-primary h-10 px-4 text-sm">
          Shop now
        </Link>
      </div>
    </InfoPageShell>
  );
}
