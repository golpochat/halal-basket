import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
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
  subtotalAmount?: string | number;
  discountAmount?: string | number;
  deliveryFeeAmount?: string | number;
  couponCode?: string | null;
  totalAmount: string | number;
  fulfillments: Array<{
    id: string;
    status: string;
    deliveryDate: string | null;
    shop?: { name: string; address?: string | null };
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
  const [searchParams] = useSearchParams();
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
    let cancelled = false;
    let attempts = 0;
    const paidFlag = searchParams.get('paid');

    async function refresh() {
      const o = await load(id!);
      if (cancelled) return o;
      setOrder(o);
      if (paidFlag === '1') {
        setPayMsg(
          o.paymentStatus === 'paid'
            ? 'Payment confirmed'
            : 'Payment submitted — status updates when Stripe webhook lands',
        );
      } else if (paidFlag === '0') {
        setPayMsg('Checkout cancelled — you can pay when ready');
      }
      return o;
    }

    refresh().catch((e) => {
      if (!cancelled) setError(e.message);
    });

    // After Stripe Checkout return, webhook may lag a second or two.
    if (paidFlag !== '1') {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => {
      attempts += 1;
      refresh()
        .then((o) => {
          if (o.paymentStatus === 'paid' || attempts >= 8) {
            window.clearInterval(timer);
          }
        })
        .catch(() => undefined);
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [id, searchParams]);

  async function payNow() {
    if (!id) return;
    setPaying(true);
    setError('');
    setPayMsg('');
    try {
      const intent = await api<{
        provider: string;
        paymentIntentId?: string;
        checkoutUrl?: string;
      }>(`/payments/orders/${id}/intent`, { method: 'POST', token });

      if (intent.provider === 'stripe' && intent.checkoutUrl) {
        window.location.assign(intent.checkoutUrl);
        return;
      }

      if (intent.provider === 'mock' && intent.paymentIntentId) {
        await api(`/payments/orders/${id}/confirm-mock`, {
          method: 'POST',
          token,
          body: JSON.stringify({ paymentIntentId: intent.paymentIntentId }),
        });
        setPayMsg('Payment confirmed');
        setOrder(await load(id));
        return;
      }

      setError('Unsupported payment response');
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
        homeTo="/"
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
            <p className="font-mono text-xs text-[var(--hb-ink)]/50">
              {order.id}
            </p>
            <p>
              Status: <strong>{order.status}</strong>
            </p>
            <p>Payment: {order.paymentStatus ?? 'pending'}</p>
            <p>Mode: {order.fulfillmentMode.replaceAll('_', ' ')}</p>
            {order.subtotalAmount != null && (
              <div className="space-y-1 text-sm text-[var(--hb-ink)]/65">
                <p className="flex justify-between gap-4">
                  <span>Subtotal</span>
                  <span>€{Number(order.subtotalAmount).toFixed(2)}</span>
                </p>
                {Number(order.discountAmount ?? 0) > 0 && (
                  <p className="flex justify-between gap-4 text-[var(--hb-green)]">
                    <span>
                      Discount
                      {order.couponCode ? ` (${order.couponCode})` : ''}
                    </span>
                    <span>−€{Number(order.discountAmount).toFixed(2)}</span>
                  </p>
                )}
                {order.deliveryFeeAmount != null && (
                  <p className="flex justify-between gap-4">
                    <span>Delivery</span>
                    <span>
                      {Number(order.deliveryFeeAmount) === 0
                        ? 'Free'
                        : `€${Number(order.deliveryFeeAmount).toFixed(2)}`}
                    </span>
                  </p>
                )}
              </div>
            )}
            <p className="font-display text-2xl">
              €{Number(order.totalAmount).toFixed(2)}
            </p>
            {order.paymentStatus !== 'paid' && (
              <button
                disabled={paying}
                onClick={() => void payNow()}
                className="hb-btn hb-btn-primary w-full py-3"
              >
                {paying ? 'Processing…' : 'Pay now'}
              </button>
            )}
            <div className="space-y-2 border-t border-[rgba(26,92,58,0.1)] pt-3">
              {order.fulfillments.map((f) => (
                <div key={f.id} className="text-sm">
                  <p>Halal Basket · {f.status}</p>
                  {order.fulfillmentMode === 'pickup' && f.shop?.address && (
                    <p className="mt-1 text-[var(--hb-ink)]/65">
                      Pickup location: {f.shop.address}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex gap-4 text-sm font-medium text-[var(--hb-green)]">
          <Link to={`/customer/orders/${id}`}>Track status →</Link>
          <Link to="/">Continue shopping</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
