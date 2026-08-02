import { useEffect, useState } from 'react';
import { SelectInput } from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { Shop } from './types';

export function AdminCataloguePage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <CatalogueInner />
      </RequireRole>
    </RequireAuth>
  );
}

function CatalogueInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState('');

  useEffect(() => {
    api<Shop[]>('/admin/shops', { token })
      .then((s) => {
        setShops(s);
        if (!shopId && s[0]) setShopId(s[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  async function importCsv(file: File) {
    setError('');
    setMsg('');
    const form = new FormData();
    form.append('file', file);
    const q = shopId ? `?shopId=${shopId}` : '';
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/admin/products/import${q}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'Import failed');
      setMsg(`Imported ${body.imported}, failed ${body.failed}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Catalogue</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-8 p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">
            Catalogue import / export
          </h2>
          <div className="mt-3 flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <SelectInput
              label="Shop"
              showLabel={false}
              className="w-full min-w-0 sm:max-w-xs"
              value={shopId}
              options={shops.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              onChange={setShopId}
              placeholder="Select shop"
            />
            <label className="hb-btn hb-btn-ghost cursor-pointer">
              Import CSV
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importCsv(f);
                }}
              />
            </label>
            <a
              className="hb-btn hb-btn-ghost"
              href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/admin/products/export?format=csv`}
              onClick={(e) => {
                e.preventDefault();
                void fetch(
                  `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/admin/products/export?format=csv`,
                  { headers: { Authorization: `Bearer ${token}` } },
                )
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'products.csv';
                    a.click();
                  });
              }}
            >
              Export CSV
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
