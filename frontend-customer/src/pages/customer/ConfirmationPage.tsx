import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { SiteHeader } from '../../components/layout/SiteHeader';
import { SiteFooter } from '../../components/layout/SiteFooter';
import { LocalePickers } from '../../components/LocalePickers';
import {
  formatFulfillmentMode,
  formatOrderStatus,
  formatPaymentStatus,
  formatUserFacingError,
  StatusBadge,
  toastError,
  toastSuccess,
} from '@halal-basket/web';
import { useLocale } from '../../locale/LocaleContext';
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
    estimatedDeliveryAt?: string | null;
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
  const { t, languageCode, formatMoney } = useLocale();
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
    const sessionId = searchParams.get('session_id') ?? undefined;

    async function refresh() {
      const o = await load(id!);
      if (cancelled) return o;
      setOrder(o);
      if (paidFlag === '1') {
        setPayMsg(
          o.paymentStatus === 'paid'
            ? t('confirmation.paymentConfirmed')
            : t('confirmation.confirmingStripe'),
        );
      } else if (paidFlag === '0') {
        setPayMsg(t('confirmation.checkoutCancelled'));
      }
      return o;
    }

    async function syncStripeReturn() {
      try {
        await api(`/payments/orders/${id}/confirm-stripe`, {
          method: 'POST',
          token,
          body: JSON.stringify(sessionId ? { sessionId } : {}),
        });
      } catch {
        // Webhook may still land; keep polling below.
      }
      return refresh();
    }

    const boot =
      paidFlag === '1'
        ? syncStripeReturn()
        : refresh().then((o) => o);

    boot.catch((e) => {
      if (!cancelled) {
        const msg = formatUserFacingError(e, t('confirmation.loadFailed'));
        setError(msg);
        toastError(msg);
      }
    });

    // After Stripe Checkout return, confirm-stripe + brief poll covers lag.
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
  }, [id, searchParams, token, t]);

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
        const confirmed = t('confirmation.paymentConfirmed');
        setPayMsg(confirmed);
        toastSuccess(confirmed);
        setOrder(await load(id));
        return;
      }

      const msg = t('confirmation.payStartFailed');
      setError(msg);
      toastError(msg);
    } catch (e) {
      const msg = formatUserFacingError(e, t('confirmation.payFailed'));
      setError(msg);
      toastError(msg);
    } finally {
      setPaying(false);
    }
  }

  const paid = order?.paymentStatus === 'paid';

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader
        variant="slim"
        homeTo="/"
        actions={<LocalePickers />}
      />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">
          {paid
            ? t('confirmation.titlePaid')
            : t('confirmation.titlePlaced')}
        </h1>
        <p className="mt-2 text-[var(--hb-ink)]/65">
          {paid
            ? t('confirmation.thanks')
            : t('confirmation.payToConfirm')}
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
            <p className="text-xs text-[var(--hb-ink)]/50">
              {t('confirmation.orderRef', {
                ref: order.id.slice(0, 8).toUpperCase(),
              })}
            </p>
            <p>
              {t('confirmation.status')}{' '}
              <strong>
                {formatOrderStatus(order.status, languageCode)}
              </strong>
            </p>
            <p>
              {t('confirmation.payment')}{' '}
              <strong>
                {formatPaymentStatus(
                  order.paymentStatus ?? 'pending',
                  languageCode,
                )}
              </strong>
            </p>
            <p>
              {t('confirmation.delivery')}{' '}
              {formatFulfillmentMode(order.fulfillmentMode, languageCode)}
            </p>
            {order.subtotalAmount != null && (
              <div className="space-y-1 text-sm text-[var(--hb-ink)]/65">
                <p className="flex justify-between gap-4">
                  <span>{t('confirmation.subtotal')}</span>
                  <span className="tabular-nums">
                    {formatMoney(Number(order.subtotalAmount))}
                  </span>
                </p>
                {Number(order.discountAmount ?? 0) > 0 && (
                  <p className="flex justify-between gap-4 text-[var(--hb-green)]">
                    <span>
                      {t('confirmation.discount')}
                      {order.couponCode ? ` (${order.couponCode})` : ''}
                    </span>
                    <span className="tabular-nums">
                      −{formatMoney(Number(order.discountAmount))}
                    </span>
                  </p>
                )}
                {order.deliveryFeeAmount != null && (
                  <p className="flex justify-between gap-4">
                    <span>{t('confirmation.deliveryFee')}</span>
                    <span className="tabular-nums">
                      {Number(order.deliveryFeeAmount) === 0
                        ? t('confirmation.free')
                        : formatMoney(Number(order.deliveryFeeAmount))}
                    </span>
                  </p>
                )}
                <p className="flex justify-between gap-4 font-semibold text-[var(--hb-ink)]">
                  <span>{t('confirmation.total')}</span>
                  <span className="tabular-nums">
                    {formatMoney(Number(order.totalAmount))}
                  </span>
                </p>
              </div>
            )}
            {order.subtotalAmount == null && (
              <p className="font-display text-2xl tabular-nums">
                {formatMoney(Number(order.totalAmount))}
              </p>
            )}
            {order.paymentStatus !== 'paid' && (
              <button
                disabled={paying}
                onClick={() => void payNow()}
                className="hb-btn hb-btn-primary w-full py-3"
              >
                {paying
                  ? t('confirmation.processing')
                  : t('confirmation.payNow')}
              </button>
            )}
            <div className="space-y-2 border-t border-[rgba(26,92,58,0.1)] pt-3">
              {order.fulfillments.length > 1 && (
                <p className="text-xs text-[var(--hb-ink)]/55">
                  {t('confirmation.splitNote', {
                    count: order.fulfillments.length,
                  })}
                </p>
              )}
              {order.fulfillments.map((f, index) => (
                <div key={f.id} className="text-sm">
                  <p>
                    {order.fulfillments.length > 1
                      ? t('confirmation.partOf', {
                          part: index + 1,
                          total: order.fulfillments.length,
                        })
                      : 'Halal Basket'}{' '}
                    · <StatusBadge status={f.status} lang={languageCode} />
                  </p>
                  {order.fulfillmentMode === 'pickup' && f.shop?.address && (
                    <p className="mt-1 text-[var(--hb-ink)]/65">
                      {t('confirmation.pickupLocation', {
                        address: f.shop.address,
                      })}
                    </p>
                  )}
                  {f.estimatedDeliveryAt && (
                    <p className="mt-1 text-[var(--hb-ink)]/65">
                      {t('confirmation.eta')}{' '}
                      {new Date(f.estimatedDeliveryAt).toLocaleString(
                        languageCode,
                      )}
                    </p>
                  )}
                  {f.deliveryDate && (
                    <p className="mt-1 text-[var(--hb-ink)]/65">
                      {t('confirmation.deliveryDate')}{' '}
                      {new Date(f.deliveryDate).toLocaleDateString(
                        languageCode,
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-6 flex gap-4 text-sm font-medium text-[var(--hb-green)]">
          <Link to={`/customer/orders/${id}`}>
            {paid
              ? t('confirmation.trackStatus')
              : t('confirmation.viewOrder')}
          </Link>
          <Link to="/">{t('confirmation.continueShopping')}</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
