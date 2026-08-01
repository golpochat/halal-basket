import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ICON_SIZES, UtilityIcons, useDashboardTitle } from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Fulfillment = {
  id: string;
  status: string;
  shop?: { name: string; address: string | null };
  order: {
    id: string;
    fulfillmentMode: string;
    customer?: { name: string };
    deliveryAddress?: unknown;
  };
  items?: Array<{ quantity: number; product?: { name: string } }>;
};

const STATUSES = [
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export function DriverDetailPage() {
  useDashboardTitle('Delivery detail');
  const { session } = useAuth();
  const { id } = useParams();
  const token = session!.accessToken;
  const [item, setItem] = useState<Fulfillment | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState('');
  const [suggestBlock, setSuggestBlock] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<Fulfillment[]>('/driver/orders/today', { token })
      .then((list) => {
        const found = list.find((x) => x.id === id) ?? null;
        setItem(found);
        if (!found) setError('Fulfillment not in today’s list');
      })
      .catch((e) => setError(e.message));
  }, [id, token]);

  async function setStatus(status: string) {
    if (!id) return;
    setError('');
    setMsg('');
    try {
      await api(`/driver/orders/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      setItem((prev) => (prev ? { ...prev, status } : prev));
      setMsg('Status updated');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  }

  async function sendFeedback(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError('');
    setMsg('');
    try {
      await api(`/driver/orders/${id}/feedback`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          rating,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          suggestBlock,
        }),
      });
      setMsg('Feedback saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback failed');
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          to="/driver/dashboard"
          className="hb-icon-btn inline-flex"
          aria-label="Back to today"
          title="Back to today"
        >
          {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
        </Link>
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {msg && (
        <p className="mb-3 rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm text-[var(--hb-green)]">
          {msg}
        </p>
      )}

      {item && (
        <div className="mx-auto max-w-lg space-y-4">
          <div className="hb-surface space-y-2 p-4 shadow-sm">
            <p className="font-display text-2xl font-semibold">
              {item.order.customer?.name ?? 'Customer'}
            </p>
            <p className="text-sm text-[var(--hb-ink)]/60">
              {item.shop?.name} · {item.order.fulfillmentMode.replaceAll('_', ' ')}
            </p>
            {item.shop?.address && (
              <p className="text-sm">{item.shop.address}</p>
            )}
            <ul className="mt-2 space-y-1 text-sm">
              {(item.items ?? []).map((it, idx) => (
                <li key={idx}>
                  {it.quantity}× {it.product?.name ?? 'Item'}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                className={`hb-icon-btn px-3 py-2 text-xs font-medium capitalize ${
                  item.status === s ? 'hb-icon-btn--primary' : ''
                }`}
                aria-label={`Set status to ${s.replaceAll('_', ' ')}`}
                title={s.replaceAll('_', ' ')}
                onClick={() => setStatus(s)}
              >
                {s.replaceAll('_', ' ')}
              </button>
            ))}
          </div>

          <form
            onSubmit={sendFeedback}
            className="hb-surface space-y-3 p-4 shadow-sm"
          >
            <h2 className="font-semibold">Customer feedback</h2>
            <label className="block text-sm font-medium">
              Rating (1–5)
              <input
                type="number"
                min={1}
                max={5}
                className="hb-input mt-1.5"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
            </label>
            <label className="block text-sm font-medium">
              Tags (comma-separated)
              <input
                className="hb-input mt-1.5"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="item_missing, late"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={suggestBlock}
                onChange={(e) => setSuggestBlock(e.target.checked)}
              />
              Suggest block customer
            </label>
            <button className="hb-btn hb-btn-primary w-full py-3">
              Submit feedback
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
