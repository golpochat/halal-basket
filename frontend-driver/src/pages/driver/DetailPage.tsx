import { FormEvent, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  deliveryAttemptReasonOptions,
  driverFeedbackTagOptions,
  ICON_SIZES,
  MenuMultiSelect,
  MenuSelect,
  Modal,
  StatusBadge,
  TextInput,
  Tooltip,
  UtilityIcons,
  formatFulfillmentMode,
  formatFulfillmentStatus,
  parseCustomFeedbackTags,
  toastError,
  toastSuccess,
  useDashboardTitle,
  useOrderLive,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
type DeliveryAddress = {
  label?: string;
  line1?: string;
  eircode?: string;
  area_name?: string;
  lat?: number;
  lng?: number;
};

type Fulfillment = {
  id: string;
  status: string;
  deliveryDate: string | null;
  estimatedDeliveryAt: string | null;
  shop?: {
    name: string;
    address: string | null;
    phone: string | null;
  };
  order: {
    id: string;
    fulfillmentMode: string;
    paymentStatus?: string;
    createdAt?: string;
    deliveryAreaName?: string | null;
    deliveryAddress?: unknown;
    customer?: {
      name: string;
      user?: { phone: string | null };
    };
  };
  items?: Array<{
    quantity: number;
    unitPrice?: string | number;
    product?: { name: string };
  }>;
};

type DetailTab = 'details' | 'items';

const DETAIL_TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'details', label: 'Details' },
  { id: 'items', label: 'Items' },
];

const STATUS_OPTIONS = [
  { value: 'ready', label: formatFulfillmentStatus('ready') },
  {
    value: 'out_for_delivery',
    label: formatFulfillmentStatus('out_for_delivery'),
  },
  { value: 'delivered', label: formatFulfillmentStatus('delivered') },
  {
    value: 'failed_attempt',
    label: formatFulfillmentStatus('failed_attempt'),
  },
  { value: 'cancelled', label: formatFulfillmentStatus('cancelled') },
];

const AREA_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  lucan: { lat: 53.3572, lng: -6.4486 },
  swords: { lat: 53.4597, lng: -6.2181 },
  tallaght: { lat: 53.2889, lng: -6.3556 },
};

function parseDeliveryAddress(raw: unknown): DeliveryAddress | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const str = (...keys: string[]) => {
    for (const k of keys) {
      const v = o[k];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return undefined;
  };
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  const addr: DeliveryAddress = {
    label: str('label'),
    line1: str('line1', 'address', 'street'),
    eircode: str('eircode', 'postcode', 'postal'),
    area_name: str('area_name', 'area', 'areaName'),
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
  };
  if (
    !addr.label &&
    !addr.line1 &&
    !addr.eircode &&
    !addr.area_name &&
    addr.lat == null
  ) {
    return null;
  }
  return addr;
}

function money(value: string | number | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '€0.00';
  return `€${n.toFixed(2)}`;
}

function formatPaymentStatus(status: string | undefined): string {
  if (!status) return '—';
  return status
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function areaCentroid(area: string | null | undefined) {
  if (!area?.trim()) return null;
  return AREA_CENTROIDS[area.trim().toLowerCase()] ?? null;
}

function buildDirectionsUrl(opts: {
  line1?: string;
  eircode?: string;
  area?: string;
  shopAddress?: string | null;
  lat?: number;
  lng?: number;
  isPickup?: boolean;
}): string | null {
  if (opts.lat != null && opts.lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${opts.lat},${opts.lng}`;
  }
  const parts = [opts.line1, opts.eircode, opts.area].filter(Boolean);
  if (opts.isPickup && opts.shopAddress) {
    parts.unshift(opts.shopAddress);
  }
  if (parts.length === 0) {
    const c = areaCentroid(opts.area);
    if (c) {
      return `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
    }
    if (opts.shopAddress) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(opts.shopAddress)}`;
    }
    return null;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(parts.join(', '))}`;
}

function DefSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
        {title}
      </h4>
      <dl className="space-y-2.5 text-sm">{children}</dl>
    </section>
  );
}

function DefRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
      <dt className="pt-0.5 text-[var(--hb-ink)]/50">{label}</dt>
      <dd className="min-w-0 font-medium text-[var(--hb-ink)] break-words">
        {children}
      </dd>
    </div>
  );
}

function ActionBtn({
  href,
  disabled,
  disabledTip,
  variant,
  icon,
  label,
}: {
  href?: string;
  disabled?: boolean;
  disabledTip?: string;
  variant: 'primary' | 'ghost';
  icon: ReactNode;
  label: string;
}) {
  const cls = `hb-driver-action hb-driver-action--${variant}`;

  if (disabled || !href) {
    const btn = (
      <button type="button" className={cls} disabled aria-disabled="true">
        {icon}
        <span>{label}</span>
      </button>
    );
    return disabledTip ? (
      <Tooltip content={disabledTip}>{btn}</Tooltip>
    ) : (
      btn
    );
  }

  return (
    <a
      href={href}
      className={cls}
      {...(href.startsWith('http')
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export function DriverDetailPage() {
  useDashboardTitle('Delivery detail');
  const { session } = useAuth();
  const { id } = useParams();
  const token = session!.accessToken;
  const [item, setItem] = useState<Fulfillment | null>(null);
  const [tab, setTab] = useState<DetailTab>('details');
  const [failOpen, setFailOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [failReasons, setFailReasons] = useState<string[]>([]);
  const [failNote, setFailNote] = useState('');
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState('');
  const [suggestBlock, setSuggestBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api<Fulfillment>(`/driver/orders/${id}`, { token })
      .then(setItem)
      .catch((e) => toastError(e, 'Could not load delivery'));
  }, [id, token]);

  const { snapshot: live } = useOrderLive({
    orderId: item?.order.id,
    token,
    baseUrl: API_URL,
    enabled: Boolean(item?.order.id),
  });

  useEffect(() => {
    if (!item?.id || !live) return;
    const match = live.fulfillments.find((f) => f.id === item.id);
    if (!match) return;
    setItem((prev) => {
      if (!prev || prev.status === match.status) return prev;
      return { ...prev, status: match.status };
    });
  }, [live, item?.id]);

  const isTerminal =
    item?.status === 'delivered' ||
    item?.status === 'failed_attempt' ||
    item?.status === 'cancelled';
  const backTo = isTerminal ? '/driver/history' : '/driver/dashboard';
  const backLabel =
    backTo === '/driver/history' ? 'Back to history' : 'Back to dashboard';

  const address = useMemo(
    () => parseDeliveryAddress(item?.order.deliveryAddress),
    [item?.order.deliveryAddress],
  );

  const isPickup = item?.order.fulfillmentMode === 'pickup';
  const customerPhone = item?.order.customer?.user?.phone?.trim() || '';
  const areaName =
    address?.area_name || item?.order.deliveryAreaName || undefined;
  const line1 =
    address?.line1 ||
    (isPickup ? item?.shop?.address || undefined : undefined);
  const eircode = address?.eircode;
  const addressMissing = !isPickup && !address?.line1 && !address?.eircode;

  const directionsUrl = useMemo(() => {
    if (!item) return null;
    return buildDirectionsUrl({
      line1: address?.line1,
      eircode: address?.eircode,
      area: areaName,
      shopAddress: item.shop?.address,
      lat: address?.lat,
      lng: address?.lng,
      isPickup,
    });
  }, [item, address, areaName, isPickup]);

  const lineItems = item?.items ?? [];
  const itemCount = lineItems.reduce((sum, it) => sum + it.quantity, 0);

  const statusOptions = useMemo(() => {
    const current = item?.status;
    if (!current) return STATUS_OPTIONS;
    if (STATUS_OPTIONS.some((o) => o.value === current)) return STATUS_OPTIONS;
    return [
      ...STATUS_OPTIONS,
      { value: current, label: formatFulfillmentStatus(current) },
    ];
  }, [item?.status]);

  async function setStatus(
    status: string,
    extra?: { reasons?: string[]; note?: string },
  ): Promise<boolean> {
    if (!id) return false;
    setBusy(true);
    try {
      await api(`/driver/orders/${id}/status`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          status,
          reasons: extra?.reasons,
          note: extra?.note?.trim() || undefined,
        }),
      });
      setItem((prev) => (prev ? { ...prev, status } : prev));
      toastSuccess(
        status === 'failed_attempt'
          ? 'Failed attempt recorded'
          : 'Status updated',
      );
      return true;
    } catch (e) {
      toastError(e, 'Could not update status');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onStatusPick(next: string) {
    if (!item || next === item.status || busy) return;
    if (next === 'failed_attempt') {
      setFailReasons([]);
      setFailNote('');
      setFailOpen(true);
      return;
    }
    const ok = await setStatus(next);
    if (ok && next === 'delivered') {
      setRating(5);
      setSelectedTags([]);
      setCustomTags('');
      setSuggestBlock(false);
      setFeedbackOpen(true);
    }
  }

  async function confirmFailedAttempt() {
    if (failReasons.length === 0) {
      toastError(new Error('Select at least one reason'));
      return;
    }
    const ok = await setStatus('failed_attempt', {
      reasons: failReasons,
      note: failNote,
    });
    if (ok) setFailOpen(false);
  }

  async function sendFeedback(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const tags = [
      ...selectedTags,
      ...parseCustomFeedbackTags(customTags).filter(
        (t) => !selectedTags.includes(t),
      ),
    ];
    setBusy(true);
    try {
      await api(`/driver/orders/${id}/feedback`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          rating,
          tags,
          suggestBlock,
        }),
      });
      toastSuccess('Feedback saved');
      setFeedbackOpen(false);
    } catch (err) {
      toastError(err, 'Could not save feedback');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hb-driver-detail">
      <div className="mb-4">
        <Tooltip content={backLabel}>
          <Link
            to={backTo}
            className="hb-icon-btn inline-flex"
            aria-label={backLabel}
          >
            {UtilityIcons.chevronLeft({ size: ICON_SIZES.sm })}
          </Link>
        </Tooltip>
      </div>

      {item && (
        <section className="hb-surface overflow-hidden shadow-sm">
          <div className="hb-driver-ticket__head !pb-4 sm:!pb-5">
            <div className="hb-driver-ticket__title-block">
              <h2 className="text-lg font-semibold tracking-tight text-[var(--hb-ink)]">
                {item.order.customer?.name ?? 'Customer'}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={item.status} />
                <span className="rounded-md border border-[rgba(26,92,58,0.14)] bg-white px-2 py-0.5 text-xs font-semibold text-[var(--hb-ink)]/65">
                  {formatFulfillmentMode(item.order.fulfillmentMode)}
                </span>
              </div>
            </div>

            <div
              className="hb-driver-ticket__actions"
              role="group"
              aria-label="Stop actions"
            >
              <ActionBtn
                href={customerPhone ? `tel:${customerPhone}` : undefined}
                disabled={!customerPhone}
                disabledTip="No customer phone on file"
                variant="primary"
                icon={UtilityIcons.phone({ size: ICON_SIZES.sm })}
                label="Call customer"
              />
              <ActionBtn
                href={directionsUrl ?? undefined}
                disabled={!directionsUrl}
                disabledTip="No destination available"
                variant="ghost"
                icon={UtilityIcons.locate({ size: ICON_SIZES.sm })}
                label="Directions"
              />
            </div>
          </div>

          <div
            className="hb-driver-tabs"
            role="tablist"
            aria-label="Delivery sections"
          >
            {DETAIL_TABS.map((t) => {
              const selected = tab === t.id;
              const itemLabel =
                t.id === 'items' ? `Items (${itemCount})` : t.label;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`driver-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`driver-panel-${t.id}`}
                  tabIndex={selected ? 0 : -1}
                  className={`hb-driver-tabs__tab${selected ? ' is-active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {itemLabel}
                </button>
              );
            })}
          </div>

          <div
            id={`driver-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`driver-tab-${tab}`}
            className="hb-driver-tabs__panel"
          >
            {tab === 'details' ? (
              <div>
                <div className="hb-driver-ticket__meta !mt-0 !border-0 !px-0 !pt-0">
                  <span>
                    Order{' '}
                    <span className="font-mono font-semibold text-[var(--hb-ink)]/80">
                      {item.order.id.slice(0, 8)}…
                    </span>
                  </span>
                  <span>
                    Payment{' '}
                    <strong className="font-semibold text-[var(--hb-ink)]/80">
                      {formatPaymentStatus(item.order.paymentStatus)}
                    </strong>
                  </span>
                  {item.order.createdAt ? (
                    <span>
                      Placed{' '}
                      <strong className="font-semibold text-[var(--hb-ink)]/80">
                        {new Date(item.order.createdAt).toLocaleString()}
                      </strong>
                    </span>
                  ) : null}
                </div>

                <div className="hb-driver-ticket__grid !border-0 !px-0 !pt-4">
                  <DefSection title="Customer">
                    <DefRow label="Name">
                      {item.order.customer?.name ?? '—'}
                    </DefRow>
                    <DefRow label="Phone">
                      {customerPhone || (
                        <span className="font-normal text-[var(--hb-ink)]/45">
                          No number on file
                        </span>
                      )}
                    </DefRow>
                  </DefSection>

                  <DefSection title={isPickup ? 'Pickup' : 'Delivery'}>
                    {isPickup ? (
                      <>
                        <DefRow label="Mode">Customer pickup</DefRow>
                        <DefRow label="Location">
                          {line1 || item.shop?.name || '—'}
                        </DefRow>
                      </>
                    ) : (
                      <>
                        {address?.label ? (
                          <DefRow label="Label">{address.label}</DefRow>
                        ) : null}
                        <DefRow label="Address">
                          {address?.line1 ? (
                            address.line1
                          ) : addressMissing ? (
                            <span className="font-normal text-[var(--hb-ink)]/55">
                              Not on file
                              {areaName ? ` · area ${areaName}` : ''}
                              {item.shop?.address
                                ? ` · shop ${item.shop.address}`
                                : ''}
                            </span>
                          ) : (
                            '—'
                          )}
                        </DefRow>
                        <DefRow label="Eircode">{eircode || '—'}</DefRow>
                        <DefRow label="Area">{areaName || '—'}</DefRow>
                      </>
                    )}
                    <DefRow label="Date">
                      {item.deliveryDate
                        ? new Date(item.deliveryDate).toLocaleDateString()
                        : '—'}
                    </DefRow>
                    {item.estimatedDeliveryAt ? (
                      <DefRow label="ETA">
                        {new Date(item.estimatedDeliveryAt).toLocaleString()}
                      </DefRow>
                    ) : null}
                  </DefSection>

                  <DefSection title="Shop">
                    <DefRow label="Name">{item.shop?.name ?? '—'}</DefRow>
                    <DefRow label="Address">{item.shop?.address ?? '—'}</DefRow>
                    <DefRow label="Phone">
                      {item.shop?.phone ? (
                        <a
                          href={`tel:${item.shop.phone}`}
                          className="text-[var(--hb-green)] hover:underline"
                        >
                          {item.shop.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </DefRow>
                  </DefSection>
                </div>
              </div>
            ) : null}

            {tab === 'items' ? (
              <div>
                <p className="mb-3 text-sm text-[var(--hb-ink)]/55">
                  {itemCount} item{itemCount === 1 ? '' : 's'} on this delivery
                </p>
                <div className="hb-data-table-wrap border-0 shadow-none">
                  <table className="hb-data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit price</th>
                        <th style={{ textAlign: 'right' }}>Line total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((it, idx) => {
                        const unit = Number(it.unitPrice ?? 0);
                        const line = unit * it.quantity;
                        return (
                          <tr key={idx}>
                            <td className="font-semibold">
                              {it.product?.name ?? 'Item'}
                            </td>
                            <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                            <td
                              className="text-[var(--hb-ink)]/65"
                              style={{ textAlign: 'right' }}
                            >
                              {money(unit)}
                            </td>
                            <td style={{ textAlign: 'right' }}>{money(line)}</td>
                          </tr>
                        );
                      })}
                      {lineItems.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-[var(--hb-ink)]/55">
                            No line items on this fulfillment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>

          <footer className="hb-driver-status-footer">
            <div className="hb-driver-status-footer__row">
              <div className="min-w-0 flex-1">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                  Update status
                </p>
                <MenuSelect
                  label="Delivery status"
                  showLabel={false}
                  fullWidth
                  disabled={busy}
                  value={item.status}
                  options={statusOptions}
                  onChange={onStatusPick}
                />
              </div>
            </div>
          </footer>
        </section>
      )}

      <Modal
        open={failOpen}
        title={formatFulfillmentStatus('failed_attempt')}
        onClose={() => !busy && setFailOpen(false)}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={busy || failReasons.length === 0}
              onClick={() => void confirmFailedAttempt()}
            >
              Confirm failed attempt
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => setFailOpen(false)}
            >
              Cancel
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[var(--hb-ink)]/65">
            Why did the delivery attempt fail?{' '}
            <span className="text-[var(--hb-ink)]/45">(required)</span>
          </p>
          <MenuMultiSelect
            label="Attempt reasons"
            showLabel={false}
            fullWidth
            placeholder="Select reasons…"
            options={deliveryAttemptReasonOptions()}
            value={failReasons}
            onChange={setFailReasons}
          />
          <TextInput
            label="Note (optional)"
            value={failNote}
            onChange={(e) => setFailNote(e.target.value)}
            placeholder="e.g. left card, gate code unknown"
          />
        </div>
      </Modal>

      <Modal
        open={feedbackOpen}
        title="Customer feedback"
        onClose={() => !busy && setFeedbackOpen(false)}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              form="driver-feedback-form"
              variant="primary"
              disabled={busy}
            >
              Submit feedback
            </Button>
            <Button
              variant="tertiary"
              disabled={busy}
              onClick={() => setFeedbackOpen(false)}
            >
              Skip
            </Button>
          </div>
        }
      >
        <form
          id="driver-feedback-form"
          onSubmit={sendFeedback}
          className="space-y-3"
        >
          <p className="text-sm text-[var(--hb-ink)]/65">
            Optional — note anything useful for risk and stock.
          </p>
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
          <MenuMultiSelect
            label="Tags"
            showLabel
            fullWidth
            placeholder="Select tags…"
            options={driverFeedbackTagOptions()}
            value={selectedTags}
            onChange={setSelectedTags}
          />
          <TextInput
            label="Custom tags (optional)"
            value={customTags}
            onChange={(e) => setCustomTags(e.target.value)}
            placeholder="e.g. gate code issue, dog"
          />
          <p className="text-xs text-[var(--hb-ink)]/50">
            Pick from the list above. Add any extra tags here, comma-separated.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={suggestBlock}
              onChange={(e) => setSuggestBlock(e.target.checked)}
            />
            Suggest block customer
          </label>
        </form>
      </Modal>
    </div>
  );
}
