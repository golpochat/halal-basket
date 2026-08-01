import { FormEvent, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

export function AdminShopsPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <ShopsInner />
      </RequireRole>
    </RequireAuth>
  );
}

function ShopsInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [shopName, setShopName] = useState('');

  async function createShop(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/admin/shops', {
        method: 'POST',
        token,
        body: JSON.stringify({
          name: shopName,
          deliveryZones: ['Lucan'],
          isActive: true,
        }),
      });
      setShopName('');
      setMsg('Shop created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Shop create failed');
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Shops</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-8 p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Create shop</h2>
          <form onSubmit={createShop} className="mt-3 flex flex-wrap gap-2">
            <input
              className="hb-input min-w-[14rem] flex-1"
              placeholder="Shop name"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
            />
            <button className="hb-btn hb-btn-primary">Create shop</button>
          </form>
        </section>
      </div>
    </>
  );
}
