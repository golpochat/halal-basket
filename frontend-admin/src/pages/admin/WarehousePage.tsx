import { useEffect, useState } from 'react';
import {
  ICON_SIZES,
  IconButton,
  Modal,
  UtilityIcons,
} from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { WarehouseRow } from './types';

type Draft = {
  name: string;
  address: string;
  lat: string;
  lng: string;
  zones: string;
};

function emptyDraft(): Draft {
  return {
    name: '',
    address: '',
    lat: '',
    lng: '',
    zones: '',
  };
}

function parseZones(value: string): string[] {
  return value
    .split(',')
    .map((z) => z.trim())
    .filter(Boolean);
}

function zonesLabel(zones: unknown): string {
  if (!Array.isArray(zones)) return '—';
  const list = zones.filter((z): z is string => typeof z === 'string');
  return list.length > 0 ? list.join(', ') : '—';
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

export function AdminWarehousePage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['warehouses.read']}>
        <WarehouseInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function WarehouseInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('warehouses.write');
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [modalError, setModalError] = useState('');

  async function refresh() {
    const data = await api<WarehouseRow[]>('/admin/platform/warehouses', {
      token,
    });
    setRows(data);
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message));
  }, [token]);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(row: WarehouseRow) {
    setEditingId(row.id);
    const zones = Array.isArray(row.deliveryZones)
      ? (row.deliveryZones as string[]).filter((z) => typeof z === 'string')
      : [];
    setDraft({
      name: row.name,
      address: row.address ?? '',
      lat: row.lat != null ? String(row.lat) : '',
      lng: row.lng != null ? String(row.lng) : '',
      zones: zones.join(', '),
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
    if (!draft.name.trim()) {
      setModalError('Name is required.');
      return;
    }
    const latRaw = draft.lat.trim();
    const lngRaw = draft.lng.trim();
    const lat = latRaw === '' ? null : Number(latRaw);
    const lng = lngRaw === '' ? null : Number(lngRaw);
    if (latRaw !== '' && !Number.isFinite(lat)) {
      setModalError('Latitude must be a number.');
      return;
    }
    if (lngRaw !== '' && !Number.isFinite(lng)) {
      setModalError('Longitude must be a number.');
      return;
    }

    setBusy(true);
    setError('');
    setMsg('');
    setModalError('');
    try {
      const body = {
        name: draft.name.trim(),
        address: draft.address.trim() || undefined,
        lat,
        lng,
        deliveryZones: parseZones(draft.zones),
      };
      const data =
        editingId == null
          ? await api<WarehouseRow[]>('/admin/platform/warehouses', {
              method: 'POST',
              token,
              body: JSON.stringify(body),
            })
          : await api<WarehouseRow[]>(
              `/admin/platform/warehouses/${editingId}`,
              {
                method: 'PATCH',
                token,
                body: JSON.stringify(body),
              },
            );
      setRows(data);
      setMsg(editingId == null ? 'Warehouse added' : 'Warehouse updated');
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to save warehouse',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(row: WarehouseRow) {
    if (!window.confirm(`Delete warehouse “${row.name}”?`)) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const data = await api<WarehouseRow[]>(
        `/admin/platform/warehouses/${row.id}`,
        { method: 'DELETE', token },
      );
      setRows(data);
      setMsg('Warehouse deleted');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete warehouse',
      );
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(row: WarehouseRow, published: boolean) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const data = await api<WarehouseRow[]>(
        `/admin/platform/warehouses/${row.id}/publish`,
        {
          method: 'PUT',
          token,
          body: JSON.stringify({ published }),
        },
      );
      setRows(data);
      setMsg(
        published
          ? `${row.name} published for customer fulfillment`
          : `${row.name} unpublished`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update publish state',
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: WarehouseRow, isActive: boolean) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const data = await api<WarehouseRow[]>(
        `/admin/platform/warehouses/${row.id}/active`,
        {
          method: 'PUT',
          token,
          body: JSON.stringify({ isActive }),
        },
      );
      setRows(data);
      setMsg(isActive ? `${row.name} activated` : `${row.name} deactivated`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update active state',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Warehouses
      </h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Warehouses</h2>
            {canWrite ? (
              <button
                type="button"
                className="hb-btn hb-btn-primary shrink-0 px-3.5 py-2 text-sm"
                onClick={openCreate}
              >
                Add warehouse
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
            Published warehouses can fulfill customer orders. Active controls
            whether the warehouse is available for planning; customers see
            product availability, not warehouse names.
          </p>

          <div className="hb-data-table-wrap mt-4">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Zones</th>
                  <th>Active</th>
                  <th>Published</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.name}</td>
                    <td className="text-[var(--hb-ink)]/65">
                      {row.address?.trim() || '—'}
                    </td>
                    <td className="text-[var(--hb-ink)]/65">
                      {zonesLabel(row.deliveryZones)}
                    </td>
                    <td>
                      <StatusSwitch
                        checked={row.isActive}
                        disabled={!canWrite || busy}
                        label={`${row.name} ${row.isActive ? 'active' : 'inactive'}`}
                        onChange={(next) => void toggleActive(row, next)}
                      />
                    </td>
                    <td>
                      <StatusSwitch
                        checked={row.published}
                        disabled={!canWrite || busy}
                        label={`${row.name} ${row.published ? 'published' : 'unpublished'}`}
                        onChange={(next) => void togglePublished(row, next)}
                      />
                    </td>
                    <td>
                      {canWrite ? (
                        <div className="hb-data-table__actions">
                          <IconButton
                            label={`Edit ${row.name}`}
                            tooltip="Edit"
                            onClick={() => openEdit(row)}
                          >
                            {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                          </IconButton>
                          <IconButton
                            label={`Delete ${row.name}`}
                            tooltip="Delete"
                            tone="danger"
                            onClick={() => void removeRow(row)}
                          >
                            {UtilityIcons.trash({ size: ICON_SIZES.sm })}
                          </IconButton>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-[var(--hb-ink)]/55">
                      No warehouses configured.
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
        title={editingId == null ? 'Add warehouse' : 'Edit warehouse'}
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
              disabled={busy}
              onClick={() => void saveModal()}
            >
              {busy
                ? 'Saving…'
                : editingId == null
                  ? 'Add warehouse'
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
            Name
            <input
              className="hb-input mt-1.5"
              value={draft.name}
              onChange={(e) =>
                setDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="e.g. HB Dublin Warehouse"
              maxLength={120}
            />
          </label>
          <label className="block text-sm">
            Address
            <input
              className="hb-input mt-1.5"
              value={draft.address}
              onChange={(e) =>
                setDraft((d) => ({ ...d, address: e.target.value }))
              }
              placeholder="Street, city, postcode"
              maxLength={240}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Latitude
              <input
                className="hb-input mt-1.5"
                value={draft.lat}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, lat: e.target.value }))
                }
                placeholder="53.344"
              />
            </label>
            <label className="block text-sm">
              Longitude
              <input
                className="hb-input mt-1.5"
                value={draft.lng}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, lng: e.target.value }))
                }
                placeholder="-6.42"
              />
            </label>
          </div>
          <label className="block text-sm">
            Delivery zones
            <input
              className="hb-input mt-1.5"
              placeholder="Lucan, Swords, Tallaght"
              value={draft.zones}
              onChange={(e) =>
                setDraft((d) => ({ ...d, zones: e.target.value }))
              }
            />
          </label>
        </div>
      </Modal>
    </>
  );
}
