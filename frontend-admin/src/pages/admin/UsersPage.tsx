import { FormEvent, useEffect, useState } from 'react';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Flash } from './Flash';
import type { Shop } from './types';

export function AdminUsersPage() {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <UsersInner />
      </RequireRole>
    </RequireAuth>
  );
}

function UsersInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'shop' | 'driver' | 'admin'>('driver');
  const [name, setName] = useState('');
  const [shopId, setShopId] = useState('');

  useEffect(() => {
    api<Shop[]>('/admin/shops', { token })
      .then((s) => {
        setShops(s);
        if (!shopId && s[0]) setShopId(s[0].id);
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api('/admin/users', {
        method: 'POST',
        token,
        body: JSON.stringify({
          email,
          password,
          role,
          name: role === 'admin' ? undefined : name,
          shopId: role === 'shop' ? shopId : undefined,
        }),
      });
      setMsg('User created');
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Users</h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-8 p-5 shadow-sm">
          <h2 className="font-display text-xl font-semibold">Create user</h2>
          <form onSubmit={createUser} className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="hb-input"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              wrapperClassName="mt-0"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <input
              className="hb-input"
              placeholder="Name (shop/driver)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="hb-input"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as 'shop' | 'driver' | 'admin')
              }
            >
              <option value="driver">driver</option>
              <option value="shop">shop</option>
              <option value="admin">admin</option>
            </select>
            {role === 'shop' && (
              <select
                className="hb-input sm:col-span-2"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
            <button className="hb-btn hb-btn-primary sm:col-span-2">
              Create user
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
