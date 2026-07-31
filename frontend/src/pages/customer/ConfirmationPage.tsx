import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LocalePickers } from '../../components/LocalePickers';
import { api } from '../../lib/api';

type Order = {
  id: string;
  status: string;
  fulfillmentMode: string;
  paymentStatus?: string;
  totalAmount: string | number;
  fulfillments: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    shop?: { name: string };
  }>;
};

export function ConfirmationPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['customer']}>
        <ConfirmationInner />
      </RequireRole>
    </RequireAuth>
  );
}

function ConfirmationInner() {
  const { session } = useAuth();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [payMsg, setPayMsg] = useState('');
  const [paying, setPaying] = useState(false);
  const token = session!.accessToken;

  async function load(orderId: string) {
    return api<Order>(`/orders/${orderId}`, { token });
  }

  useEffect(() => {
    if (!id) return;
    load(id)
      .then(setOrder)
      .catch((e) => setError(e.message));
  }, [id]);

  async function payMock() {
    if (!id) return;
    setPaying(true);
    setError('');
    setPayMsg('');
    try {
      const intent = await api<{
        provider: string;
        paymentIntentId: string;
      }>(`/payments/orders/${id}/intent`, { method: 'POST', token });
      if (intent.provider === 'mock') {
        await api(`/payments/orders/${id}/confirm-mock`, {
          method: 'POST',
          token,
          body: JSON.stringify({ paymentIntentId: intent.paymentIntentId }),
        });
        setPayMsg('Payment confirmed');
      } else {
        setPayMsg('Stripe intent created — complete with Stripe.js in production');
      }
      setOrder(await load(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        variant="slim"
        homeTo="/customer"
        actions={<LocalePickers />}
      />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold">
        Order confirmed
      </h1>
      <p className="mt-2 text-[var(--hb-ink)]/65">
        Thanks — we&apos;re preparing your basket.
      </p>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}
      {payMsg && (
        <p className="mt-4 rounded-lg bg-[var(--hb-mist)] px-3 py-2 text-sm text-[var(--hb-green)]">
          {payMsg}
        </p>
      )}
      {order && (
        <div className="hb-surface mt-6 space-y-3 p-6 shadow-sm">
          <p className="font-mono text-xs text-[var(--hb-ink)]/50">{order.id}</p>
          <p>
            Status: <strong>{order.status}</strong>
          </p>
          <p>Payment: {order.paymentStatus ?? 'pending'}</p>
          <p>Mode: {order.fulfillmentMode.replaceAll('_', ' ')}</p>
          <p className="font-display text-2xl">
            €{Number(order.totalAmount).toFixed(2)}
          </p>
          {order.paymentStatus !== 'paid' && (
            <button
              disabled={paying}
              onClick={payMock}
              className="hb-btn hb-btn-primary w-full py-3"
            >
              {paying ? 'Processing…' : 'Pay now'}
            </button>
          )}
          <div className="space-y-2 border-t border-[rgba(26,92,58,0.1)] pt-3">
            {order.fulfillments.map((f) => (
              <p key={f.id} className="text-sm">
                {f.shop?.name ?? 'Shop'} · {f.status}
              </p>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 flex gap-4 text-sm font-medium text-[var(--hb-green)]">
        <Link to={`/customer/orders/${id}`}>Track status →</Link>
        <Link to="/customer">Continue shopping</Link>
      </div>
    </main>
      <SiteFooter />
    </div>
  );
}
