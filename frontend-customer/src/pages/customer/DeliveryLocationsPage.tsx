import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toastError } from '@halal-basket/web';
import { InfoPageShell } from '../../components/layout/InfoPageShell';
import { api } from '../../lib/api';

type DeliveryConfig = {
  areas: Array<{
    areaName: string;
    deliveryDays: string[];
    deliveryFee?: number;
  }>;
};

function titleCaseDay(day: string) {
  if (!day) return day;
  return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
}

export function DeliveryLocationsPage() {
  const [areas, setAreas] = useState<DeliveryConfig['areas'] | null>(null);

  useEffect(() => {
    api<DeliveryConfig>('/platform/delivery-config')
      .then((cfg) => setAreas(cfg.areas))
      .catch((e) => toastError(e, 'Could not load delivery areas'));
  }, []);

  const rows = useMemo(() => {
    if (!areas) return [];
    return areas.map((a) => ({
      name: a.areaName,
      day: a.deliveryDays.map(titleCaseDay).join(', '),
      fee: a.deliveryFee,
    }));
  }, [areas]);

  return (
    <InfoPageShell
      wide
      title="Delivery locations"
      subtitle="Pilot zones with scheduled delivery days."
    >
      {areas === null && (
        <p className="text-sm text-[var(--hb-ink)]/55">Loading areas…</p>
      )}

      {areas && rows.length === 0 && (
        <p className="text-sm text-[var(--hb-ink)]/65">
          No delivery areas are configured yet. Pickup may still be available
          where offered.
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.12)] bg-white/80">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Delivery days by pilot area</caption>
            <thead className="bg-[var(--hb-mist)] text-[var(--hb-ink)]/55">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                  Area
                </th>
                <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                  Delivery day
                </th>
                <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
                  Fee
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((area, i) => (
                <tr
                  key={area.name}
                  className={
                    i < rows.length - 1
                      ? 'border-b border-[rgba(26,92,58,0.08)]'
                      : undefined
                  }
                >
                  <th
                    scope="row"
                    className="px-4 py-4 font-semibold text-[var(--hb-ink)] sm:px-5"
                  >
                    {area.name}
                  </th>
                  <td className="px-4 py-4 font-medium text-[var(--hb-green)] sm:px-5">
                    {area.day}
                  </td>
                  <td className="px-4 py-4 text-[var(--hb-ink)]/75 sm:px-5">
                    {area.fee == null
                      ? '—'
                      : area.fee === 0
                        ? 'Free'
                        : `€${area.fee.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-sm leading-relaxed text-[var(--hb-ink)]/60">
        Outside these areas, scheduled delivery is not available yet. Pickup from
        Halal Basket still works where offered.
      </p>

      <div className="mt-12 flex flex-col gap-4 border-t border-[rgba(26,92,58,0.1)] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--hb-ink)]/55">
          See{' '}
          <Link
            to="/delivery-charges"
            className="font-semibold text-[var(--hb-green)]"
          >
            Delivery charges
          </Link>{' '}
          or the{' '}
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
