import { useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { WarehouseAdmin } from './types';

export function AdminWarehousePage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <WarehouseInner />
      </RequireRole>
    </RequireAuth>
  );
}

function WarehouseInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [whPublished, setWhPublished] = useState(false);
  const [whName, setWhName] = useState('HB Dublin Warehouse');
  const [whAddress, setWhAddress] = useState('');
  const [whLat, setWhLat] = useState('');
  const [whLng, setWhLng] = useState('');
  const [whZones, setWhZones] = useState('Lucan, Swords, Tallaght');
  const [whActive, setWhActive] = useState(true);

  function applyWarehouse(wh: WarehouseAdmin) {
    setWhPublished(wh.published);
    if (wh.warehouse) {
      setWhName(wh.warehouse.name);
      setWhAddress(wh.warehouse.address ?? '');
      setWhLat(wh.warehouse.lat != null ? String(wh.warehouse.lat) : '');
      setWhLng(wh.warehouse.lng != null ? String(wh.warehouse.lng) : '');
      setWhActive(wh.warehouse.isActive);
      const zones = Array.isArray(wh.warehouse.deliveryZones)
        ? (wh.warehouse.deliveryZones as string[])
        : [];
      setWhZones(zones.join(', '));
    }
  }

  useEffect(() => {
    api<WarehouseAdmin>('/admin/platform/warehouse', { token })
      .then(applyWarehouse)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Warehouse</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Warehouse fulfillment</h2>
              <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
                Prefer the HB warehouse when it can fulfill the basket. Unpublished
                = not used for customer fulfillment (prep stock anytime).
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                whPublished
                  ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
                  : 'bg-[rgba(26,92,58,0.08)] text-[var(--hb-ink)]/55'
              }`}
            >
              {whPublished ? 'Published' : 'Unpublished'}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="hb-btn hb-btn-primary px-4 py-2 text-sm"
              onClick={async () => {
                setError('');
                setMsg('');
                try {
                  const res = await api<WarehouseAdmin>(
                    '/admin/platform/warehouse/publish',
                    {
                      method: 'PUT',
                      token,
                      body: JSON.stringify({ published: !whPublished }),
                    },
                  );
                  setWhPublished(res.published);
                  setMsg(
                    res.published
                      ? 'Warehouse published for customer fulfillment'
                      : 'Warehouse unpublished',
                  );
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'Failed to update publish state',
                  );
                }
              }}
            >
              {whPublished ? 'Unpublish' : 'Publish'}
            </button>
          </div>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setMsg('');
              try {
                const zones = whZones
                  .split(',')
                  .map((z) => z.trim())
                  .filter(Boolean);
                const res = await api<WarehouseAdmin>(
                  '/admin/platform/warehouse',
                  {
                    method: 'PUT',
                    token,
                    body: JSON.stringify({
                      name: whName.trim(),
                      address: whAddress.trim(),
                      lat: whLat === '' ? null : Number(whLat),
                      lng: whLng === '' ? null : Number(whLng),
                      isActive: whActive,
                      deliveryZones: zones,
                    }),
                  },
                );
                applyWarehouse(res);
                setMsg('Warehouse saved');
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Failed to save warehouse',
                );
              }
            }}
          >
            <label className="text-sm sm:col-span-2">
              Internal name
              <input
                className="hb-input mt-1.5"
                value={whName}
                onChange={(e) => setWhName(e.target.value)}
                required
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Address
              <input
                className="hb-input mt-1.5"
                value={whAddress}
                onChange={(e) => setWhAddress(e.target.value)}
                placeholder="Pickup / dispatch address"
              />
            </label>
            <label className="text-sm">
              Latitude
              <input
                className="hb-input mt-1.5"
                type="number"
                step="any"
                value={whLat}
                onChange={(e) => setWhLat(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Longitude
              <input
                className="hb-input mt-1.5"
                type="number"
                step="any"
                value={whLng}
                onChange={(e) => setWhLng(e.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Delivery zones (comma-separated)
              <input
                className="hb-input mt-1.5"
                value={whZones}
                onChange={(e) => setWhZones(e.target.value)}
                placeholder="Lucan, Swords, Tallaght"
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={whActive}
                onChange={(e) => setWhActive(e.target.checked)}
              />
              Warehouse active
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="hb-btn hb-btn-primary px-4 py-2 text-sm"
              >
                Save warehouse
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
