import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type ThreadRow = {
  id: string;
  phoneE164: string;
  status: 'open' | 'closed';
  needsAssistance: boolean;
  lastMessageAt: string;
  customer: { id: string; name: string; email: string } | null;
  lastMessage: {
    body: string;
    direction: 'inbound' | 'outbound';
    createdAt: string;
  } | null;
};

type PendingCommerce = {
  catalogId?: string | null;
  items: Array<{ productId: string; quantity: number }>;
  note?: string;
  receivedAt?: string;
};

type ThreadDetail = {
  id: string;
  phoneE164: string;
  status: 'open' | 'closed';
  needsAssistance: boolean;
  pendingCommerce: PendingCommerce | null;
  lastMessageAt: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  recentOrders: Array<{
    id: string;
    ref: string;
    status: string;
    paymentStatus: string;
    totalAmount: string;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    direction: 'inbound' | 'outbound';
    body: string;
    createdAt: string;
  }>;
};

type ListFilter = 'open' | 'closed' | 'needs' | 'all';
type PageTab = 'inbox' | 'catalog' | 'simulate';

type SyncResult = {
  attempted: number;
  ok: number;
  catalogConfigured: boolean;
  sampleRetailerIds?: string[];
  skippedMetaPolicy?: number;
  prunedMetaPolicy?: number;
};

type CatalogPick = {
  id: string;
  name: string;
  price: number;
};

type SimCartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

const TAB_CLASS = (active: boolean) =>
  `rounded-t-lg px-3 py-2 text-sm font-medium transition ${
    active
      ? 'bg-white text-[var(--hb-ink)] shadow-[0_-1px_0_0_#fff,0_1px_0_0_rgba(26,92,58,0.12)]'
      : 'text-[var(--hb-ink)]/55 hover:text-[var(--hb-ink)]'
  }`;

function isSystemMessage(body: string): boolean {
  const t = body.trim();
  if (t.startsWith('[') && t.includes(']')) return true;
  if (/wa_assist=/.test(t)) return true;
  if (/^Continue your Halal Basket order here/i.test(t)) return true;
  if (/^Shop Halal Basket here:/i.test(t)) return true;
  return false;
}

function systemLabel(body: string): string {
  const t = body.trim();
  if (/wa_assist=|Continue your Halal Basket order here/i.test(t)) {
    return 'Assist link sent';
  }
  if (/^Shop Halal Basket here:/i.test(t)) return 'Shop link sent';
  if (/catalog unavailable/i.test(t)) {
    return 'Catalog unavailable — shop link sent';
  }
  if (/catalog message sent/i.test(t)) return 'Catalog message sent';
  if (/commerce cart/i.test(t)) {
    const m = /\[commerce cart\]\s*(.+)/i.exec(t);
    return m ? `Cart received: ${m[1]}` : 'Cart received';
  }
  const bracket = /^\[([^\]]+)\]/.exec(t);
  if (bracket) return bracket[1];
  return t.length > 72 ? `${t.slice(0, 72)}…` : t;
}

function snippetPreview(body: string | undefined): string {
  if (!body) return '—';
  if (isSystemMessage(body)) return systemLabel(body);
  const one = body.replace(/\s+/g, ' ').trim();
  return one.length > 56 ? `${one.slice(0, 56)}…` : one;
}

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminWhatsappInboxPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['whatsapp.read']}>
        <WhatsappInboxInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function WhatsappInboxInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canReply =
    isSuper || (session!.permissions ?? []).includes('whatsapp.reply');

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [pageTab, setPageTab] = useState<PageTab>('inbox');
  const [listFilter, setListFilter] = useState<ListFilter>('open');
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [simPhone, setSimPhone] = useState('+353');
  const [simBody, setSimBody] = useState('CATALOG');
  const [simProductId, setSimProductId] = useState('');
  const [simQty, setSimQty] = useState('1');
  const [simCartLines, setSimCartLines] = useState<SimCartLine[]>([]);
  const [catalogPicks, setCatalogPicks] = useState<CatalogPick[]>([]);
  const [catalogPicksError, setCatalogPicksError] = useState('');
  const [catalogPicksLoading, setCatalogPicksLoading] = useState(false);

  const loadThreads = useCallback(async () => {
    const q = new URLSearchParams();
    if (listFilter === 'open' || listFilter === 'closed') {
      q.set('status', listFilter);
    }
    if (listFilter === 'needs') {
      q.set('needsAssistance', 'true');
      q.set('status', 'open');
    }
    const qs = q.toString();
    const list = await api<ThreadRow[]>(
      `/admin/whatsapp/threads${qs ? `?${qs}` : ''}`,
      { token },
    );
    setThreads(list);
    return list;
  }, [listFilter, token]);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!id) {
        setDetail(null);
        return;
      }
      const d = await api<ThreadDetail>(`/admin/whatsapp/threads/${id}`, {
        token,
      });
      setDetail(d);
    },
    [token],
  );

  useEffect(() => {
    if (pageTab !== 'simulate' || !canReply) return;
    let cancelled = false;
    void (async () => {
      setCatalogPicksLoading(true);
      setCatalogPicksError('');
      try {
        const result = await api<{ products: CatalogPick[] }>(
          '/admin/whatsapp/catalog/products',
          { token },
        );
        if (cancelled) return;
        setCatalogPicks(result.products);
        setSimProductId((prev) => {
          if (prev && result.products.some((p) => p.id === prev)) return prev;
          return result.products[0]?.id ?? '';
        });
      } catch (err) {
        if (!cancelled) {
          setCatalogPicks([]);
          setCatalogPicksError(
            err instanceof Error ? err.message : 'Could not load products',
          );
        }
      } finally {
        if (!cancelled) setCatalogPicksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageTab, canReply, token]);

  useEffect(() => {
    void (async () => {
      try {
        setError('');
        const list = await loadThreads();
        if (selectedId && !list.some((t) => t.id === selectedId)) {
          setSelectedId(list[0]?.id ?? '');
        } else if (!selectedId && list[0]) {
          setSelectedId(list[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load threads');
      }
    })();
  }, [loadThreads]); // eslint-disable-line react-hooks/exhaustive-deps -- refresh list on filter

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void (async () => {
      try {
        setError('');
        await loadDetail(selectedId);
      } catch (err) {
        setDetail(null);
        setError(err instanceof Error ? err.message : 'Thread not found');
      }
    })();
  }, [selectedId, loadDetail]);

  async function sendReply(e: FormEvent) {
    e.preventDefault();
    if (!canReply || !selectedId || !reply.trim()) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const d = await api<ThreadDetail>(
        `/admin/whatsapp/threads/${selectedId}/reply`,
        {
          method: 'POST',
          token,
          body: JSON.stringify({ body: reply.trim() }),
        },
      );
      setDetail(d);
      setReply('');
      setMsg('Reply sent');
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reply failed');
    } finally {
      setBusy(false);
    }
  }

  async function closeThread() {
    if (!canReply || !selectedId) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const d = await api<ThreadDetail>(
        `/admin/whatsapp/threads/${selectedId}/close`,
        { method: 'POST', token },
      );
      setDetail(d);
      setMsg('Thread closed');
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Close failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendAssistLink() {
    if (!canReply || !selectedId) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const result = await api<{ thread: ThreadDetail }>(
        `/admin/whatsapp/threads/${selectedId}/send-assist-link`,
        { method: 'POST', token },
      );
      setDetail(result.thread);
      setMsg('Assist link sent');
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assist link failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendShopLink() {
    if (!canReply || !selectedId) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const d = await api<ThreadDetail>(
        `/admin/whatsapp/threads/${selectedId}/send-shop-link`,
        { method: 'POST', token },
      );
      setDetail(d);
      setMsg('Shop link sent');
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shop link failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendCatalog() {
    if (!canReply || !selectedId) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api(`/admin/whatsapp/threads/${selectedId}/send-catalog`, {
        method: 'POST',
        token,
      });
      setMsg('Catalog sent');
      await loadDetail(selectedId);
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Catalog send failed');
    } finally {
      setBusy(false);
    }
  }

  async function syncCatalog() {
    if (!canReply) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const result = await api<SyncResult>('/admin/whatsapp/catalog/sync', {
        method: 'POST',
        token,
      });
      setSyncResult(result);
      const failedHint =
        result.ok === 0 && result.attempted > 0
          ? ' — 0 accepted (see API logs: Meta permissions on catalog, public HTTPS images, or catalog access)'
          : '';
      setMsg(
        `Catalog sync: ${result.ok}/${result.attempted} products` +
          (result.catalogConfigured
            ? failedHint
            : ' (stub — set WHATSAPP_CATALOG_ID for Meta)'),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Catalog sync failed');
    } finally {
      setBusy(false);
    }
  }

  async function afterSimulate(threadId: string) {
    setPageTab('inbox');
    setListFilter('open');
    const list = await loadThreads();
    setSelectedId(threadId);
    if (!list.some((t) => t.id === threadId)) {
      await loadDetail(threadId);
    }
  }

  async function simulateInbound(e: FormEvent) {
    e.preventDefault();
    if (!canReply) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const result = await api<{ threadId: string }>('/whatsapp/dev/inbound', {
        method: 'POST',
        token,
        body: JSON.stringify({
          phone: simPhone.trim(),
          body: simBody.trim(),
        }),
      });
      setMsg('Simulated inbound stored — switched to Inbox');
      await afterSimulate(result.threadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulate failed');
    } finally {
      setBusy(false);
    }
  }

  async function simulateCommerceOrder(e: FormEvent) {
    e.preventDefault();
    if (!canReply) return;
    if (simCartLines.length === 0) {
      setError('Add at least one product to the cart');
      return;
    }
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const result = await api<{
        threadId: string;
        placed: boolean;
        orderId?: string;
      }>('/whatsapp/dev/order', {
        method: 'POST',
        token,
        body: JSON.stringify({
          phone: simPhone.trim(),
          items: simCartLines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
          })),
        }),
      });
      setMsg(
        result.placed
          ? `Order placed ${result.orderId?.slice(0, 8) ?? ''} (${simCartLines.length} lines) — switched to Inbox`
          : 'Cart parked — needs help / link phone',
      );
      setSimCartLines([]);
      await afterSimulate(result.threadId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commerce simulate failed');
    } finally {
      setBusy(false);
    }
  }

  function addSimCartLine() {
    const pick = catalogPicks.find((p) => p.id === simProductId);
    const quantity = Math.max(1, parseInt(simQty, 10) || 1);
    if (!pick) {
      setError('Select a product from the list');
      return;
    }
    setError('');
    setSimCartLines((prev) => {
      const existing = prev.find((l) => l.productId === pick.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === pick.id
            ? { ...l, quantity: l.quantity + quantity }
            : l,
        );
      }
      return [
        ...prev,
        {
          productId: pick.id,
          name: pick.name,
          price: pick.price,
          quantity,
        },
      ];
    });
  }

  const pending = detail?.pendingCommerce;
  const needsCount = threads.filter((t) => t.needsAssistance).length;

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        WhatsApp
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--hb-ink)]/60">
        Care inbox, assist links, and catalog commerce. Carts create unpaid
        orders with a Stripe pay link.
      </p>

      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <div
          className="flex flex-wrap gap-2 border-b border-[rgba(26,92,58,0.12)] pb-px"
          role="tablist"
          aria-label="WhatsApp sections"
        >
          {(
            [
              ['inbox', 'Inbox'],
              ['catalog', 'Catalog'],
              ['simulate', 'Simulate'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={pageTab === id}
              className={TAB_CLASS(pageTab === id)}
              onClick={() => setPageTab(id)}
            >
              {label}
              {id === 'inbox' && needsCount > 0 ? (
                <span className="ml-1.5 text-xs font-normal text-[var(--hb-ink)]/45">
                  {needsCount} help
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <section className="hb-surface rounded-t-none p-5 shadow-sm">
          {pageTab === 'inbox' ? (
            <InboxTab
              canReply={canReply}
              busy={busy}
              listFilter={listFilter}
              setListFilter={setListFilter}
              threads={threads}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              detail={detail}
              pending={pending}
              reply={reply}
              setReply={setReply}
              onRefresh={() =>
                void loadThreads().then(() => {
                  if (selectedId) return loadDetail(selectedId);
                })
              }
              onSendReply={(e) => void sendReply(e)}
              onAssist={() => void sendAssistLink()}
              onCatalog={() => void sendCatalog()}
              onShop={() => void sendShopLink()}
              onClose={() => void closeThread()}
              onGoSimulate={() => setPageTab('simulate')}
            />
          ) : null}

          {pageTab === 'catalog' ? (
            <CatalogTab
              canReply={canReply}
              busy={busy}
              syncResult={syncResult}
              onSync={() => void syncCatalog()}
            />
          ) : null}

          {pageTab === 'simulate' ? (
            <SimulateTab
              canReply={canReply}
              busy={busy}
              simPhone={simPhone}
              setSimPhone={setSimPhone}
              simBody={simBody}
              setSimBody={setSimBody}
              simProductId={simProductId}
              setSimProductId={setSimProductId}
              simQty={simQty}
              setSimQty={setSimQty}
              simCartLines={simCartLines}
              setSimCartLines={setSimCartLines}
              catalogPicks={catalogPicks}
              catalogPicksLoading={catalogPicksLoading}
              catalogPicksError={catalogPicksError}
              onAddLine={addSimCartLine}
              onInbound={(e) => void simulateInbound(e)}
              onCommerce={(e) => void simulateCommerceOrder(e)}
            />
          ) : null}
        </section>
      </div>
    </>
  );
}

function InboxTab(props: {
  canReply: boolean;
  busy: boolean;
  listFilter: ListFilter;
  setListFilter: (f: ListFilter) => void;
  threads: ThreadRow[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  detail: ThreadDetail | null;
  pending: PendingCommerce | null | undefined;
  reply: string;
  setReply: (v: string) => void;
  onRefresh: () => void;
  onSendReply: (e: FormEvent) => void;
  onAssist: () => void;
  onCatalog: () => void;
  onShop: () => void;
  onClose: () => void;
  onGoSimulate: () => void;
}) {
  const {
    canReply,
    busy,
    listFilter,
    setListFilter,
    threads,
    selectedId,
    setSelectedId,
    detail,
    pending,
    reply,
    setReply,
    onRefresh,
    onSendReply,
    onAssist,
    onCatalog,
    onShop,
    onClose,
    onGoSimulate,
  } = props;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ['open', 'Open'],
            ['needs', 'Needs help'],
            ['closed', 'Closed'],
            ['all', 'All'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`hb-btn px-2.5 py-1 text-xs ${
              listFilter === key ? 'hb-btn-primary' : 'hb-btn-ghost'
            }`}
            onClick={() => setListFilter(key)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className="hb-btn hb-btn-ghost px-2.5 py-1 text-xs"
          disabled={busy}
          onClick={onRefresh}
        >
          Refresh
        </button>
      </div>

      <div className="grid min-h-[28rem] gap-3 lg:h-[min(68vh,36rem)] lg:grid-cols-[minmax(13rem,18rem)_1fr]">
        <aside className="hb-wa-scroll min-h-0 overflow-y-auto rounded-lg border border-[rgba(26,92,58,0.1)] bg-[rgba(26,92,58,0.02)] p-1">
          {threads.length === 0 ? (
            <p className="p-3 text-sm text-[var(--hb-ink)]/50">
              No threads yet.{' '}
              <button type="button" className="underline" onClick={onGoSimulate}>
                Simulate
              </button>{' '}
              a message to create one.
            </p>
          ) : (
            <ul>
              {threads.map((t) => {
                const active = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2.5 py-2 text-left text-sm transition ${
                        active
                          ? 'bg-[rgba(26,92,58,0.12)]'
                          : 'hover:bg-[rgba(26,92,58,0.06)]'
                      }`}
                      onClick={() => setSelectedId(t.id)}
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <span className="truncate">
                          {t.customer?.name ?? t.phoneE164}
                        </span>
                        {t.needsAssistance ? (
                          <span className="shrink-0 rounded bg-[rgba(180,120,20,0.15)] px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--hb-ink)]/65">
                            Help
                          </span>
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-[var(--hb-ink)]/45">
                        {snippetPreview(t.lastMessage?.body)}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-[rgba(26,92,58,0.1)]">
          {!detail ? (
            <p className="p-4 text-sm text-[var(--hb-ink)]/50">
              Select a thread to view messages.
            </p>
          ) : (
            <>
              <div className="shrink-0 space-y-2 border-b border-[rgba(26,92,58,0.1)] px-3 py-2.5">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">
                    {detail.customer?.name ?? detail.phoneE164}
                    {detail.needsAssistance ? (
                      <span className="ml-2 rounded bg-[rgba(180,120,20,0.15)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--hb-ink)]/65">
                        Needs help
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-[var(--hb-ink)]/50">
                    {detail.phoneE164}
                    {detail.customer ? (
                      <>
                        {' · '}
                        <Link
                          className="underline"
                          to={`../gdpr?customerId=${detail.customer.id}`}
                        >
                          {detail.customer.email}
                        </Link>
                      </>
                    ) : (
                      ' · unmatched'
                    )}
                    {' · '}
                    {detail.status}
                    {detail.recentOrders[0]
                      ? ` · ${detail.recentOrders[0].ref} (${detail.recentOrders[0].paymentStatus})`
                      : null}
                  </p>
                </div>

                {canReply && detail.status === 'open' ? (
                  <div className="flex flex-nowrap items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      className="hb-btn hb-btn-primary shrink-0 px-2.5 py-1 text-xs"
                      disabled={busy}
                      onClick={onAssist}
                    >
                      Assist link
                    </button>
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost shrink-0 px-2.5 py-1 text-xs"
                      disabled={busy}
                      onClick={onCatalog}
                    >
                      Catalog
                    </button>
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost shrink-0 px-2.5 py-1 text-xs"
                      disabled={busy}
                      onClick={onShop}
                    >
                      Shop link
                    </button>
                    <button
                      type="button"
                      className="hb-btn hb-btn-ghost shrink-0 px-2.5 py-1 text-xs"
                      disabled={busy}
                      onClick={onClose}
                    >
                      Close
                    </button>
                  </div>
                ) : null}

                {pending?.items?.length ? (
                  <p className="truncate rounded bg-[rgba(180,120,20,0.08)] px-2 py-1 text-xs text-[var(--hb-ink)]/65">
                    <span className="font-medium">Pending cart:</span>{' '}
                    {pending.items
                      .map((i) => `${i.quantity}× ${i.productId.slice(0, 8)}`)
                      .join(' · ')}
                  </p>
                ) : null}
              </div>

              <div className="hb-wa-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {detail.messages.map((m) => {
                  if (isSystemMessage(m.body)) {
                    return (
                      <div
                        key={m.id}
                        className="flex justify-center px-2"
                        title={m.body}
                      >
                        <p className="max-w-full truncate text-center text-[11px] text-[var(--hb-ink)]/40">
                          {formatMsgTime(m.createdAt)} · {systemLabel(m.body)}
                        </p>
                      </div>
                    );
                  }
                  const outbound = m.direction === 'outbound';
                  return (
                    <div
                      key={m.id}
                      className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          outbound
                            ? 'bg-[rgba(26,92,58,0.12)]'
                            : 'bg-[rgba(0,0,0,0.04)]'
                        }`}
                      >
                        <p className="mb-1 text-[10px] uppercase tracking-wide text-[var(--hb-ink)]/35">
                          {outbound ? 'Out' : 'In'} · {formatMsgTime(m.createdAt)}
                        </p>
                        <p className="break-words whitespace-pre-wrap">{m.body}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {canReply ? (
                <form
                  className="flex shrink-0 items-end gap-2 border-t border-[rgba(26,92,58,0.08)] bg-[rgba(26,92,58,0.02)] px-3 py-2.5"
                  onSubmit={onSendReply}
                >
                  <textarea
                    className="hb-input min-h-[2.5rem] max-h-28 flex-1 resize-y border-[rgba(26,92,58,0.12)] bg-white text-sm"
                    placeholder="Reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    maxLength={4000}
                    rows={2}
                  />
                  <button
                    type="submit"
                    className="hb-btn hb-btn-primary shrink-0 px-3 py-2 text-sm"
                    disabled={busy || !reply.trim()}
                  >
                    Send
                  </button>
                </form>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogTab(props: {
  canReply: boolean;
  busy: boolean;
  syncResult: SyncResult | null;
  onSync: () => void;
}) {
  const { canReply, busy, syncResult, onSync } = props;
  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h2 className="font-semibold">Catalog sync</h2>
        <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
          Pushes up to 100 in-stock products to Meta Commerce. Retailer ID is
          the product UUID (same as web checkout). Product images must be
          public <code className="text-xs">https://</code> URLs — set{' '}
          <code className="text-xs">PUBLIC_API_URL</code> to your Cloudflare
          tunnel (or CDN) so <code className="text-xs">/uploads/…</code> paths
          resolve. Link the catalog to your WhatsApp account in Business
          settings before sending catalog messages.
        </p>
      </div>

      {canReply ? (
        <div className="space-y-2">
          <button
            type="button"
            className="hb-btn hb-btn-primary"
            disabled={busy}
            onClick={onSync}
            aria-busy={busy}
          >
            {busy ? 'Syncing…' : 'Sync catalog'}
          </button>
          {busy ? (
            <p className="text-sm text-[var(--hb-ink)]/55">
              Pushing products to Meta Commerce. This can take up to a minute —
              keep this tab open.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[var(--hb-ink)]/50">
          Requires <code className="text-xs">whatsapp.reply</code> to sync.
        </p>
      )}

      {syncResult && !busy ? (
        <div className="rounded-lg border border-[rgba(26,92,58,0.12)] px-4 py-3 text-sm">
          <p>
            Last sync:{' '}
            <span className="font-medium">
              {syncResult.ok}/{syncResult.attempted}
            </span>{' '}
            products
            {syncResult.ok === 0 && syncResult.attempted > 0 ? (
              <span className="text-[var(--hb-danger,#b42318)]">
                {' '}
                — none accepted (check backend logs: catalog permissions,
                image HTTPS URLs, or wrong catalog ID)
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-[var(--hb-ink)]/55">
            Mode:{' '}
            {syncResult.catalogConfigured
              ? 'Meta catalog'
              : 'Local stub (no WHATSAPP_CATALOG_ID)'}
          </p>
          {typeof syncResult.skippedMetaPolicy === 'number' ||
          typeof syncResult.prunedMetaPolicy === 'number' ? (
            <p className="mt-1 text-[var(--hb-ink)]/55">
              Meta policy filter: skipped{' '}
              {syncResult.skippedMetaPolicy ?? 0} meat/fish/eggs candidate
              {(syncResult.skippedMetaPolicy ?? 0) === 1 ? '' : 's'}
              {typeof syncResult.prunedMetaPolicy === 'number'
                ? `; pruned ${syncResult.prunedMetaPolicy} from Meta`
                : ''}
              . Those SKUs stay in the customer app (Assist / Shop).
            </p>
          ) : null}
          {syncResult.sampleRetailerIds?.length ? (
            <p className="mt-2 font-mono text-xs text-[var(--hb-ink)]/45">
              Sample IDs: {syncResult.sampleRetailerIds.slice(0, 3).join(', ')}
            </p>
          ) : null}
        </div>
      ) : !busy ? (
        <p className="text-sm text-[var(--hb-ink)]/45">
          No sync run this session yet.
        </p>
      ) : null}

      <p className="text-xs text-[var(--hb-ink)]/45">
        To send the catalog into a chat, open <strong>Inbox</strong>, select a
        thread, and use <strong>Catalog</strong> — or have the customer text{' '}
        <code>CATALOG</code>.
      </p>
    </div>
  );
}

function SimulateTab(props: {
  canReply: boolean;
  busy: boolean;
  simPhone: string;
  setSimPhone: (v: string) => void;
  simBody: string;
  setSimBody: (v: string) => void;
  simProductId: string;
  setSimProductId: (v: string) => void;
  simQty: string;
  setSimQty: (v: string) => void;
  simCartLines: SimCartLine[];
  setSimCartLines: (lines: SimCartLine[] | ((prev: SimCartLine[]) => SimCartLine[])) => void;
  catalogPicks: CatalogPick[];
  catalogPicksLoading: boolean;
  catalogPicksError: string;
  onAddLine: () => void;
  onInbound: (e: FormEvent) => void;
  onCommerce: (e: FormEvent) => void;
}) {
  const {
    canReply,
    busy,
    simPhone,
    setSimPhone,
    simBody,
    setSimBody,
    simProductId,
    setSimProductId,
    simQty,
    setSimQty,
    simCartLines,
    setSimCartLines,
    catalogPicks,
    catalogPicksLoading,
    catalogPicksError,
    onAddLine,
    onInbound,
    onCommerce,
  } = props;

  if (!canReply) {
    return (
      <p className="text-sm text-[var(--hb-ink)]/50">
        Requires <code className="text-xs">whatsapp.reply</code> to run local
        simulators.
      </p>
    );
  }

  const cartTotal = simCartLines.reduce(
    (sum, l) => sum + l.price * l.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--hb-ink)]/55">
        Local-only tools (staff auth). Inbound is stored even if Meta
        auto-reply fails (expired token / allow list). For console-only
        replies, clear <code className="text-xs">WHATSAPP_TOKEN</code> or
        refresh the token in Meta Step 1. Successful runs switch you back to{' '}
        <strong>Inbox</strong>.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-3" onSubmit={onInbound}>
          <h2 className="font-semibold text-sm">Inbound message</h2>
          <p className="text-xs text-[var(--hb-ink)]/45">
            Try HELP, STATUS, PAY, LIST, CATALOG, or a free-text shopping list.
          </p>
          <label className="block text-sm">
            <span className="text-[var(--hb-ink)]/55">Phone (E.164)</span>
            <input
              className="hb-input mt-1 w-full"
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--hb-ink)]/55">Message</span>
            <input
              className="hb-input mt-1 w-full"
              value={simBody}
              onChange={(e) => setSimBody(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="hb-btn hb-btn-primary"
            disabled={busy || !simPhone.trim() || !simBody.trim()}
          >
            Send simulated message
          </button>
        </form>

        <form className="space-y-3" onSubmit={onCommerce}>
          <h2 className="font-semibold text-sm">Commerce cart</h2>
          <p className="text-xs text-[var(--hb-ink)]/45">
            Same path as a Meta multi-item cart. Add products, then submit once
            — like WhatsApp “send cart”.
          </p>
          <label className="block text-sm">
            <span className="text-[var(--hb-ink)]/55">Phone (E.164)</span>
            <input
              className="hb-input mt-1 w-full"
              value={simPhone}
              onChange={(e) => setSimPhone(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--hb-ink)]/55">Product</span>
            <select
              className="hb-input mt-1 w-full"
              value={simProductId}
              onChange={(e) => setSimProductId(e.target.value)}
              disabled={catalogPicksLoading || catalogPicks.length === 0}
            >
              {catalogPicksLoading ? (
                <option value="">Loading…</option>
              ) : catalogPicks.length === 0 ? (
                <option value="">No Meta-safe products in stock</option>
              ) : (
                catalogPicks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — €{p.price.toFixed(2)}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--hb-ink)]/55">Qty</span>
            <div
              className="mt-1 inline-flex h-[2.875rem] w-[9.5rem] items-stretch overflow-hidden rounded-[var(--hb-radius)] border border-[rgba(19,38,28,0.15)] bg-white"
              role="group"
              aria-label="Quantity"
            >
              <button
                type="button"
                className="flex w-10 shrink-0 items-center justify-center border-0 bg-transparent text-base leading-none text-[var(--hb-ink)]/75 hover:bg-[rgba(19,38,28,0.05)] disabled:opacity-40"
                aria-label="Decrease quantity"
                disabled={busy || (parseInt(simQty, 10) || 1) <= 1}
                onClick={() =>
                  setSimQty(String(Math.max(1, (parseInt(simQty, 10) || 1) - 1)))
                }
              >
                −
              </button>
              <input
                className="min-w-0 flex-1 border-0 border-x border-[rgba(19,38,28,0.15)] bg-transparent px-1 text-center font-inherit outline-none"
                inputMode="numeric"
                aria-label="Quantity value"
                value={simQty}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  if (raw === '') {
                    setSimQty('');
                    return;
                  }
                  setSimQty(
                    String(Math.min(99, Math.max(1, parseInt(raw, 10) || 1))),
                  );
                }}
                onBlur={() => {
                  if (!simQty.trim() || (parseInt(simQty, 10) || 0) < 1) {
                    setSimQty('1');
                  }
                }}
              />
              <button
                type="button"
                className="flex w-10 shrink-0 items-center justify-center border-0 bg-transparent text-base leading-none text-[var(--hb-ink)]/75 hover:bg-[rgba(19,38,28,0.05)] disabled:opacity-40"
                aria-label="Increase quantity"
                disabled={busy || (parseInt(simQty, 10) || 1) >= 99}
                onClick={() =>
                  setSimQty(String(Math.min(99, (parseInt(simQty, 10) || 1) + 1)))
                }
              >
                +
              </button>
            </div>
          </label>
          <button
            type="button"
            className="hb-btn hb-btn-ghost w-full"
            disabled={
              busy || catalogPicksLoading || !simProductId.trim()
            }
            onClick={onAddLine}
          >
            Add to cart
          </button>

          {simCartLines.length > 0 ? (
            <ul className="space-y-2 rounded-lg border border-[var(--hb-ink)]/10 p-3 text-sm">
              {simCartLines.map((line) => (
                <li
                  key={line.productId}
                  className="flex items-start justify-between gap-2"
                >
                  <span className="min-w-0">
                    <span className="font-medium">
                      {line.quantity}× {line.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--hb-ink)]/45">
                      €{(line.price * line.quantity).toFixed(2)}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-xs text-[var(--hb-danger,#b42318)] underline"
                    onClick={() =>
                      setSimCartLines((prev) =>
                        prev.filter((l) => l.productId !== line.productId),
                      )
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
              <li className="border-t border-[var(--hb-ink)]/10 pt-2 font-medium">
                Subtotal €{cartTotal.toFixed(2)} · {simCartLines.length} line
                {simCartLines.length === 1 ? '' : 's'}
              </li>
            </ul>
          ) : (
            <p className="text-xs text-[var(--hb-ink)]/45">
              Cart is empty — add one or more products above.
            </p>
          )}

          {catalogPicksError ? (
            <p className="text-sm text-[var(--hb-danger,#b42318)]">
              {catalogPicksError}
            </p>
          ) : null}
          <button
            type="submit"
            className="hb-btn hb-btn-primary"
            disabled={
              busy ||
              !simPhone.trim() ||
              simCartLines.length === 0 ||
              catalogPicksLoading
            }
          >
            Submit simulated cart
          </button>
        </form>
      </div>
    </div>
  );
}
