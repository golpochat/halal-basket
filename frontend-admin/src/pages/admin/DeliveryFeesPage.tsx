import { useEffect, useMemo, useState } from 'react';
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
import { WEEKDAYS, type CalendarAdminRow, type DeliveryFees } from './types';

type LocationRow = {
  id: string;
  areaName: string;
  deliveryDay: string;
  fee: number;
  isActive: boolean;
};

type LocationDraft = {
  areaName: string;
  fee: string;
  deliveryDay: string;
};

function emptyDraft(defaultFee: number): LocationDraft {
  return {
    areaName: '',
    fee: String(defaultFee),
    deliveryDay: 'tuesday',
  };
}

function buildLocationRows(
  calendarRows: CalendarAdminRow[],
  fees: DeliveryFees,
): LocationRow[] {
  return [...calendarRows]
    .map((row) => ({
      id: row.id,
      areaName: row.areaName,
      deliveryDay: row.deliveryDay,
      fee: fees.feesByArea[row.areaName] ?? fees.scheduledDeliveryFee,
      isActive: row.isActive,
    }))
    .sort((a, b) => {
      const byArea = a.areaName.localeCompare(b.areaName);
      if (byArea !== 0) return byArea;
      return a.deliveryDay.localeCompare(b.deliveryDay);
    });
}

function feesPayload(
  fees: DeliveryFees,
  feesByArea: Record<string, number>,
): DeliveryFees {
  const cleaned: Record<string, number> = {};
  for (const [name, value] of Object.entries(feesByArea)) {
    if (
      Number.isFinite(value) &&
      value !== Number(fees.scheduledDeliveryFee)
    ) {
      cleaned[name] = Number(value);
    }
  }
  return {
    scheduledDeliveryFee: Number(fees.scheduledDeliveryFee),
    pickupFee: Number(fees.pickupFee),
    freeDeliveryOverAmount: Number(fees.freeDeliveryOverAmount),
    feesByArea: cleaned,
  };
}

function StatusSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition duration-[220ms] ease-[var(--hb-ease-out)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hb-green)] disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-[var(--hb-green)]' : 'bg-[rgba(26,92,58,0.2)]'
      }`}
    >
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition duration-[220ms] ease-[var(--hb-ease-out)] ${
          checked ? 'translate-x-[1.35rem]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function sameKey(areaName: string, deliveryDay: string) {
  return `${areaName.trim().toLowerCase()}::${deliveryDay}`;
}

export function AdminDeliveryFeesPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['locations.read']}>
        <DeliveryFeesInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function DeliveryFeesInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('locations.write');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFees>({
    scheduledDeliveryFee: 3.99,
    pickupFee: 0,
    freeDeliveryOverAmount: 0,
    feesByArea: {},
  });
  const [calendarRows, setCalendarRows] = useState<CalendarAdminRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LocationDraft>(emptyDraft(3.99));
  const [modalError, setModalError] = useState('');

  const locations = useMemo(
    () => buildLocationRows(calendarRows, deliveryFees),
    [calendarRows, deliveryFees],
  );

  async function refresh() {
    const [fees, cal] = await Promise.all([
      api<DeliveryFees>('/admin/platform/delivery-fees', { token }),
      api<CalendarAdminRow[]>('/admin/delivery-calendar', { token }),
    ]);
    setDeliveryFees({
      scheduledDeliveryFee: fees.scheduledDeliveryFee,
      pickupFee: fees.pickupFee,
      freeDeliveryOverAmount: fees.freeDeliveryOverAmount ?? 0,
      feesByArea: fees.feesByArea ?? {},
    });
    setCalendarRows(cal);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [token]);

  async function saveFees(nextFeesByArea: Record<string, number>) {
    const body = feesPayload(deliveryFees, nextFeesByArea);
    const saved = await api<DeliveryFees>('/admin/platform/delivery-fees', {
      method: 'PUT',
      token,
      body: JSON.stringify(body),
    });
    setDeliveryFees({
      scheduledDeliveryFee: saved.scheduledDeliveryFee,
      pickupFee: saved.pickupFee,
      freeDeliveryOverAmount: saved.freeDeliveryOverAmount ?? 0,
      feesByArea: saved.feesByArea ?? {},
    });
    return saved;
  }

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft(deliveryFees.scheduledDeliveryFee));
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(row: LocationRow) {
    setEditingId(row.id);
    setDraft({
      areaName: row.areaName,
      fee: String(row.fee),
      deliveryDay: row.deliveryDay,
    });
    setModalError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setModalError('');
  }

  async function saveModal() {
    const areaName = draft.areaName.trim();
    if (!areaName) {
      setModalError('Location name is required');
      return;
    }
    const fee = Number(draft.fee);
    if (!Number.isFinite(fee) || fee < 0) {
      setModalError('Enter a valid fee (≥ 0)');
      return;
    }

    const key = sameKey(areaName, draft.deliveryDay);
    const duplicate = locations.some(
      (row) =>
        row.id !== editingId &&
        sameKey(row.areaName, row.deliveryDay) === key,
    );
    if (duplicate) {
      setModalError(
        'This location already has that delivery day. Pick a different day.',
      );
      return;
    }

    setError('');
    setMsg('');
    setSaving(true);
    try {
      const previous = editingId
        ? calendarRows.find((r) => r.id === editingId)
        : null;

      if (editingId == null) {
        await api('/admin/delivery-calendar', {
          method: 'POST',
          token,
          body: JSON.stringify({
            areaName,
            deliveryDay: draft.deliveryDay,
            isActive: true,
          }),
        });
      } else {
        await api(`/admin/delivery-calendar/${editingId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            areaName,
            deliveryDay: draft.deliveryDay,
          }),
        });
      }

      const nextFeesByArea = { ...deliveryFees.feesByArea };
      nextFeesByArea[areaName] = fee;

      // Drop orphan fee override if area was renamed and no other rows use old name
      if (previous && previous.areaName !== areaName) {
        const oldNameStillUsed = calendarRows.some(
          (r) => r.id !== editingId && r.areaName === previous.areaName,
        );
        if (!oldNameStillUsed) {
          delete nextFeesByArea[previous.areaName];
        }
      }

      await saveFees(nextFeesByArea);
      await refresh();
      setMsg(editingId == null ? 'Location added' : 'Location updated');
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to save location',
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeLocation(row: LocationRow) {
    if (
      !window.confirm(
        `Remove ${row.areaName} on ${row.deliveryDay}?`,
      )
    ) {
      return;
    }
    setError('');
    setMsg('');
    setSaving(true);
    try {
      await api(`/admin/delivery-calendar/${row.id}`, {
        method: 'DELETE',
        token,
      });
      const stillHasArea = calendarRows.some(
        (r) => r.id !== row.id && r.areaName === row.areaName,
      );
      const nextFeesByArea = { ...deliveryFees.feesByArea };
      if (!stillHasArea) {
        delete nextFeesByArea[row.areaName];
      }
      await saveFees(nextFeesByArea);
      await refresh();
      setMsg('Location removed');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to remove location',
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleLocationActive(row: LocationRow, next: boolean) {
    setError('');
    setMsg('');
    setSaving(true);
    try {
      await api(`/admin/delivery-calendar/${row.id}/active`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: next }),
      });
      await refresh();
      setMsg(next ? 'Location activated' : 'Location deactivated');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update status',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Location & fees
      </h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <h2 className="font-semibold">Platform defaults</h2>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Default scheduled fee applies when a location has no override.
            Free-over uses items subtotal; set to 0 to disable.
          </p>
          <form
            className="mt-4 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setMsg('');
              setSaving(true);
              try {
                await saveFees(deliveryFees.feesByArea);
                setMsg('Platform defaults saved');
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Failed to save fees',
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                Default scheduled (€)
                <input
                  className="hb-input mt-1.5"
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryFees.scheduledDeliveryFee}
                  disabled={!canWrite}
                  onChange={(e) =>
                    setDeliveryFees((f) => ({
                      ...f,
                      scheduledDeliveryFee: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                Pickup (€)
                <input
                  className="hb-input mt-1.5"
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryFees.pickupFee}
                  disabled={!canWrite}
                  onChange={(e) =>
                    setDeliveryFees((f) => ({
                      ...f,
                      pickupFee: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="text-sm">
                Free delivery over (€)
                <input
                  className="hb-input mt-1.5"
                  type="number"
                  min={0}
                  step="0.01"
                  value={deliveryFees.freeDeliveryOverAmount}
                  disabled={!canWrite}
                  onChange={(e) =>
                    setDeliveryFees((f) => ({
                      ...f,
                      freeDeliveryOverAmount: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="hb-btn hb-btn-primary px-4 py-2 text-sm"
                disabled={!canWrite || saving}
              >
                {saving ? 'Saving…' : 'Save defaults'}
              </button>
            </div>
          </form>
        </section>

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Locations</h2>
            {canWrite ? (
              <button
                type="button"
                className="hb-btn hb-btn-primary shrink-0 px-3.5 py-2 text-sm"
                onClick={openCreate}
              >
                Add location
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Each row is a location + delivery day. The same location can appear
            more than once on different days. Fee is shared by location name.
            Inactive rows are hidden from customers.
          </p>

          <div className="hb-data-table-wrap mt-4">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th>Fee</th>
                  <th>Delivery day</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.areaName}</td>
                    <td>€{Number(row.fee).toFixed(2)}</td>
                    <td className="capitalize text-[var(--hb-ink)]/65">
                      {row.deliveryDay}
                    </td>
                    <td>
                      <StatusSwitch
                        checked={row.isActive}
                        disabled={!canWrite || saving}
                        label={`${row.areaName} ${row.deliveryDay} ${row.isActive ? 'active' : 'inactive'}`}
                        onChange={(next) =>
                          void toggleLocationActive(row, next)
                        }
                      />
                    </td>
                    <td>
                      {canWrite ? (
                        <div className="hb-data-table__actions">
                          <IconButton
                            label={`Edit ${row.areaName} ${row.deliveryDay}`}
                            tooltip="Edit"
                            onClick={() => openEdit(row)}
                          >
                            {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                          </IconButton>
                          <IconButton
                            label={`Delete ${row.areaName} ${row.deliveryDay}`}
                            tooltip="Delete"
                            tone="danger"
                            onClick={() => void removeLocation(row)}
                          >
                            {UtilityIcons.trash({ size: ICON_SIZES.sm })}
                          </IconButton>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-[var(--hb-ink)]/55">
                      No locations configured.
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
        title={editingId == null ? 'Add location' : 'Edit location'}
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
                : editingId == null
                  ? 'Add location'
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
            Location
            <input
              className="hb-input mt-1.5"
              value={draft.areaName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, areaName: e.target.value }))
              }
              placeholder="e.g. Lucan"
              maxLength={80}
            />
          </label>
          <label className="block text-sm">
            Scheduled fee (€)
            <input
              className="hb-input mt-1.5"
              type="number"
              min={0}
              step="0.01"
              value={draft.fee}
              onChange={(e) =>
                setDraft((d) => ({ ...d, fee: e.target.value }))
              }
            />
          </label>
          <SelectInput
            label="Delivery day"
            value={draft.deliveryDay}
            options={WEEKDAYS.map((d) => ({
              value: d,
              label: d.charAt(0).toUpperCase() + d.slice(1),
            }))}
            onChange={(value) =>
              setDraft((d) => ({ ...d, deliveryDay: value }))
            }
          />
        </div>
      </Modal>
    </>
  );
}
