import { useEffect, useState } from 'react';
import {
  ICON_SIZES,
  IconButton,
  Modal,
  SelectInput,
  UtilityIcons,
} from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type Coupon = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  maxLimit: number | null;
  maxLimitPerUser: number | null;
};

type CouponDraft = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
  startsAtLocal: string;
  endsAtLocal: string;
  maxLimit: string;
  maxLimitPerUser: string;
};

type PromotionsResponse = {
  bannerEnabled: boolean;
  bannerMessage: string;
  coupons: Coupon[];
};

function toDatetimeLocal(iso: string | Date | null | undefined): string {
  if (iso == null || iso === '') return '';
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function emptyDraft(): CouponDraft {
  const now = toDatetimeLocal(new Date());
  return {
    code: '',
    type: 'percent',
    value: 10,
    active: true,
    startsAtLocal: now,
    endsAtLocal: now,
    maxLimit: '',
    maxLimitPerUser: '',
  };
}

function fromDatetimeLocal(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function parseOptionalInt(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function formatWindow(row: Coupon): string {
  if (!row.startsAt && !row.endsAt) return 'Always';
  const start = row.startsAt ? new Date(row.startsAt).toLocaleString() : '—';
  const end = row.endsAt ? new Date(row.endsAt).toLocaleString() : '—';
  return `${start} → ${end}`;
}

function formatLimit(n: number | null): string {
  return n == null ? '∞' : String(n);
}

function normalizeCouponList(rows: Coupon[]): Coupon[] {
  return rows.map((c) => ({
    code: c.code,
    type: c.type,
    value: c.value,
    active: c.active,
    startsAt: c.startsAt ?? null,
    endsAt: c.endsAt ?? null,
    maxLimit: c.maxLimit ?? null,
    maxLimitPerUser: c.maxLimitPerUser ?? null,
  }));
}

export function AdminPromotionsPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['promotions.read']}>
        <PromotionsInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function PromotionsInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('promotions.write');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [promoBannerEnabled, setPromoBannerEnabled] = useState(true);
  const [promoBannerMessage, setPromoBannerMessage] = useState(
    'You have reduced delivery charge',
  );
  const [promoCoupons, setPromoCoupons] = useState<Coupon[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft());
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    api<PromotionsResponse>('/admin/platform/promotions', { token })
      .then((promo) => {
        setPromoBannerEnabled(promo.bannerEnabled);
        setPromoBannerMessage(promo.bannerMessage);
        setPromoCoupons(normalizeCouponList(promo.coupons));
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  async function persist(
    next: {
      bannerEnabled?: boolean;
      bannerMessage?: string;
      coupons?: Coupon[];
    },
    successMessage: string,
  ) {
    setError('');
    setMsg('');
    setSaving(true);
    try {
      const coupons = (next.coupons ?? promoCoupons)
        .filter((c) => c.code.trim())
        .map((c) => ({
          code: c.code.trim().toUpperCase(),
          type: c.type,
          value: Number(c.value),
          active: c.active,
          startsAt: c.startsAt,
          endsAt: c.endsAt,
          maxLimit: c.maxLimit,
          maxLimitPerUser: c.maxLimitPerUser,
        }));
      const saved = await api<PromotionsResponse>(
        '/admin/platform/promotions',
        {
          method: 'PUT',
          token,
          body: JSON.stringify({
            bannerEnabled: next.bannerEnabled ?? promoBannerEnabled,
            bannerMessage: next.bannerMessage ?? promoBannerMessage,
            coupons,
          }),
        },
      );
      setPromoBannerEnabled(saved.bannerEnabled);
      setPromoBannerMessage(saved.bannerMessage);
      setPromoCoupons(normalizeCouponList(saved.coupons));
      setMsg(successMessage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save promotions',
      );
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function openCreate() {
    setEditingIndex(null);
    setDraft(emptyDraft());
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(index: number) {
    const row = promoCoupons[index];
    if (!row) return;
    setEditingIndex(index);
    setDraft({
      code: row.code,
      type: row.type,
      value: row.value,
      active: row.active,
      startsAtLocal: toDatetimeLocal(row.startsAt),
      endsAtLocal: toDatetimeLocal(row.endsAt),
      maxLimit: row.maxLimit == null ? '' : String(row.maxLimit),
      maxLimitPerUser:
        row.maxLimitPerUser == null ? '' : String(row.maxLimitPerUser),
    });
    setModalError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingIndex(null);
    setModalError('');
  }

  async function saveModal() {
    const code = draft.code.trim().toUpperCase();
    if (code.length < 2) {
      setModalError('Code must be at least 2 characters');
      return;
    }
    const value = Number(draft.value);
    if (!Number.isFinite(value) || value < 0) {
      setModalError('Enter a valid discount value');
      return;
    }
    if (draft.type === 'percent' && value > 100) {
      setModalError('Percent discount cannot exceed 100');
      return;
    }
    const startsAt = fromDatetimeLocal(draft.startsAtLocal);
    const endsAt = fromDatetimeLocal(draft.endsAtLocal);
    if (draft.startsAtLocal && !startsAt) {
      setModalError('Invalid start time');
      return;
    }
    if (draft.endsAtLocal && !endsAt) {
      setModalError('Invalid end time');
      return;
    }
    if (startsAt && endsAt && Date.parse(startsAt) > Date.parse(endsAt)) {
      setModalError('End time must be after start time');
      return;
    }
    if (draft.maxLimit.trim() && parseOptionalInt(draft.maxLimit) == null) {
      setModalError('Max limit must be a whole number ≥ 1');
      return;
    }
    if (
      draft.maxLimitPerUser.trim() &&
      parseOptionalInt(draft.maxLimitPerUser) == null
    ) {
      setModalError('Max per user must be a whole number ≥ 1');
      return;
    }

    const nextRow: Coupon = {
      code,
      type: draft.type,
      value,
      active: draft.active,
      startsAt,
      endsAt,
      maxLimit: parseOptionalInt(draft.maxLimit),
      maxLimitPerUser: parseOptionalInt(draft.maxLimitPerUser),
    };

    const duplicate = promoCoupons.some(
      (c, i) => c.code === code && i !== editingIndex,
    );
    if (duplicate) {
      setModalError('A coupon with this code already exists');
      return;
    }

    const nextCoupons =
      editingIndex == null
        ? [...promoCoupons, nextRow]
        : promoCoupons.map((c, i) => (i === editingIndex ? nextRow : c));

    try {
      await persist(
        { coupons: nextCoupons },
        editingIndex == null ? 'Coupon added' : 'Coupon updated',
      );
      closeModal();
    } catch {
      /* Flash already set */
    }
  }

  async function removeCoupon(index: number) {
    const row = promoCoupons[index];
    if (!row) return;
    if (!window.confirm(`Remove coupon ${row.code}?`)) return;
    const nextCoupons = promoCoupons.filter((_, i) => i !== index);
    try {
      await persist({ coupons: nextCoupons }, 'Coupon removed');
    } catch {
      /* Flash already set */
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Promotions
      </h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <h2 className="font-semibold">Cart promo banner</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Banner text shown in the customer cart drawer when enabled (not on
            the homepage).
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await persist(
                  {
                    bannerEnabled: promoBannerEnabled,
                    bannerMessage: promoBannerMessage,
                  },
                  'Banner saved',
                );
              } catch {
                /* Flash already set */
              }
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={promoBannerEnabled}
                disabled={!canWrite}
                onChange={(e) => setPromoBannerEnabled(e.target.checked)}
              />
              Show cart promo banner
            </label>
            <label className="block text-sm">
              Banner message
              <input
                className="hb-input mt-1.5"
                value={promoBannerMessage}
                onChange={(e) => setPromoBannerMessage(e.target.value)}
                maxLength={160}
                disabled={!canWrite || !promoBannerEnabled}
              />
            </label>
            <div className="flex justify-end">
              <button
                type="submit"
                className="hb-btn hb-btn-primary px-4 py-2 text-sm"
                disabled={!canWrite || saving}
              >
                {saving ? 'Saving…' : 'Save banner'}
              </button>
            </div>
          </form>
        </section>

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Coupons</h2>
              <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
                Validated server-side at apply and checkout. Leave limits and
                dates empty for unlimited / always-on.
              </p>
            </div>
            {canWrite ? (
              <button
                type="button"
                className="hb-btn hb-btn-primary px-3.5 py-2 text-sm"
                onClick={openCreate}
              >
                Add coupon
              </button>
            ) : null}
          </div>

          <div className="hb-data-table-wrap mt-4">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Window</th>
                  <th>Max</th>
                  <th>Per user</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {promoCoupons.map((row, idx) => (
                  <tr key={row.code}>
                    <td className="font-semibold">{row.code}</td>
                    <td className="capitalize">{row.type}</td>
                    <td>
                      {row.type === 'percent'
                        ? `${row.value}%`
                        : `€${row.value.toFixed(2)}`}
                    </td>
                    <td className="text-sm text-[var(--hb-ink)]/65">
                      {formatWindow(row)}
                    </td>
                    <td>{formatLimit(row.maxLimit)}</td>
                    <td>{formatLimit(row.maxLimitPerUser)}</td>
                    <td>
                      {row.active ? (
                        <span className="text-[var(--hb-ink)]/55">Active</span>
                      ) : (
                        <span className="font-semibold text-[var(--hb-error)]">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="hb-data-table__actions">
                        <IconButton
                          label={`Edit ${row.code}`}
                          tooltip="Edit"
                          disabled={!canWrite}
                          onClick={() => openEdit(idx)}
                        >
                          {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                        </IconButton>
                        <IconButton
                          label={`Delete ${row.code}`}
                          tooltip="Delete"
                          tone="danger"
                          disabled={!canWrite}
                          onClick={() => void removeCoupon(idx)}
                        >
                          {UtilityIcons.trash({ size: ICON_SIZES.sm })}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {promoCoupons.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-[var(--hb-ink)]/55">
                      No coupons configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Modal
        open={modalOpen}
        title={editingIndex == null ? 'Add coupon' : 'Edit coupon'}
        onClose={closeModal}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3.5 py-2 text-sm"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              type="button"
              className="hb-btn hb-btn-primary px-3.5 py-2 text-sm"
              disabled={saving}
              onClick={() => void saveModal()}
            >
              {saving
                ? 'Saving…'
                : editingIndex == null
                  ? 'Add coupon'
                  : 'Save changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {modalError && (
            <p className="text-sm font-medium text-[var(--hb-error)]">
              {modalError}
            </p>
          )}
          <label className="block text-sm">
            Code
            <input
              className="hb-input mt-1.5"
              value={draft.code}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder="HALAL10"
              maxLength={32}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectInput
              label="Discount type"
              value={draft.type}
              options={[
                { value: 'percent', label: 'Percent' },
                { value: 'fixed', label: 'Fixed €' },
              ]}
              onChange={(value) =>
                setDraft((d) => ({
                  ...d,
                  type: value as 'percent' | 'fixed',
                }))
              }
            />
            <label className="block text-sm">
              Value
              <input
                className="hb-input mt-1.5"
                type="number"
                min={0}
                step="0.01"
                value={draft.value}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, value: Number(e.target.value) }))
                }
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Start time
              <input
                className="hb-input mt-1.5"
                type="datetime-local"
                value={draft.startsAtLocal}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, startsAtLocal: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              End time
              <input
                className="hb-input mt-1.5"
                type="datetime-local"
                value={draft.endsAtLocal}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, endsAtLocal: e.target.value }))
                }
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Max limit (total)
              <input
                className="hb-input mt-1.5"
                type="number"
                min={1}
                step={1}
                placeholder="Unlimited"
                value={draft.maxLimit}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, maxLimit: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              Max limit per user
              <input
                className="hb-input mt-1.5"
                type="number"
                min={1}
                step={1}
                placeholder="Unlimited"
                value={draft.maxLimitPerUser}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    maxLimitPerUser: e.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.active}
              onChange={(e) =>
                setDraft((d) => ({ ...d, active: e.target.checked }))
              }
            />
            Active
          </label>
        </div>
      </Modal>
    </>
  );
}
