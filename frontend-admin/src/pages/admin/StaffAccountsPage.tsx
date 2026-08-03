import { useEffect, useMemo, useState } from 'react';
import {
  ICON_SIZES,
  IconButton,
  Modal,
  SelectInput,
  UtilityIcons,
} from '@halal-basket/web';
import { RequireAuth, RequireRole } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { Flash } from './Flash';
import type { Shop } from './types';

export type StaffRole = 'driver' | 'shop' | 'admin';

type AdminUserRow = {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  name: string | null;
  shop: { id: string; name: string } | null;
  staffRole: { id: string; name: string; slug: string } | null;
};

type StaffRoleOption = {
  id: string;
  name: string;
  slug: string;
  isSystem: boolean;
  isActive: boolean;
};

type Draft = {
  email: string;
  password: string;
  name: string;
  shopId: string;
  staffRoleId: string;
};

type StatusFilter = 'all' | 'active' | 'inactive';

const PAGE_COPY: Record<
  StaffRole,
  { title: string; section: string; blurb: string; addLabel: string }
> = {
  admin: {
    title: 'Admin users',
    section: 'Admin users',
    blurb:
      'Admin accounts with an assigned staff role. Create roles under Roles & permissions first.',
    addLabel: 'Add admin',
  },
  shop: {
    title: 'Shop logins',
    section: 'Shop logins',
    blurb:
      'Login accounts linked to a shop. Create the shop under Partner shops first if needed. Open Partner shops for fulfillments and payments.',
    addLabel: 'Add shop user',
  },
  driver: {
    title: 'Driver logins',
    section: 'Driver logins',
    blurb:
      'Driver login accounts used for delivery fulfillment. See Driver activity for jobs and delivery stats.',
    addLabel: 'Add driver',
  },
};

function emptyDraft(shopId = '', staffRoleId = ''): Draft {
  return {
    email: '',
    password: '',
    name: '',
    shopId,
    staffRoleId,
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

function StaffAccountsInner({ role }: { role: StaffRole }) {
  const copy = PAGE_COPY[role];
  const { session } = useAuth();
  const token = session!.accessToken;
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [staffRoles, setStaffRoles] = useState<StaffRoleOption[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [modalError, setModalError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  async function refresh() {
    const users = await api<AdminUserRow[]>('/admin/users', { token });
    setRows(users.filter((u) => u.role === role));
    if (role === 'shop') {
      const shopList = await api<Shop[]>('/admin/shops', { token });
      setShops(shopList);
    }
    if (role === 'admin') {
      const roleList = await api<StaffRoleOption[]>('/admin/rbac/roles', {
        token,
      });
      setStaffRoles(
        roleList.filter((r) => r.isActive && r.slug !== 'super-admin'),
      );
    }
  }

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    refresh().catch((e: Error) => setError(e.message));
  }, [token, role]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === 'active' && !row.isActive) return false;
      if (statusFilter === 'inactive' && row.isActive) return false;
      if (!q) return true;
      const haystack = [row.email, row.name ?? '', row.shop?.name ?? '']
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search, statusFilter]);

  function openCreate() {
    setEditingId(null);
    setDraft(
      emptyDraft(
        shops[0]?.id ?? '',
        staffRoles.find((r) => r.slug === 'admin')?.id ??
          staffRoles[0]?.id ??
          '',
      ),
    );
    setModalError('');
    setModalOpen(true);
  }

  function openEdit(row: AdminUserRow) {
    setEditingId(row.id);
    setDraft({
      email: row.email,
      password: '',
      name: row.name ?? row.shop?.name ?? '',
      shopId: row.shop?.id ?? shops[0]?.id ?? '',
      staffRoleId: row.staffRole?.id ?? staffRoles[0]?.id ?? '',
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
    if (!draft.email.trim()) {
      setModalError('Email is required.');
      return;
    }
    if (editingId == null && draft.password.length < 8) {
      setModalError('Password must be at least 8 characters.');
      return;
    }
    if (editingId != null && draft.password && draft.password.length < 8) {
      setModalError('Password must be at least 8 characters.');
      return;
    }
    if (role === 'driver' && !draft.name.trim()) {
      setModalError('Name is required for drivers.');
      return;
    }
    if (editingId != null && role === 'shop' && !draft.name.trim()) {
      setModalError('Shop name is required.');
      return;
    }
    if (role === 'shop' && !draft.shopId) {
      setModalError('Shop is required.');
      return;
    }
    if (role === 'admin' && !draft.staffRoleId) {
      setModalError('Staff role is required.');
      return;
    }

    setBusy(true);
    setError('');
    setMsg('');
    setModalError('');
    try {
      const list =
        editingId == null
          ? await api<AdminUserRow[]>('/admin/users', {
              method: 'POST',
              token,
              body: JSON.stringify({
                email: draft.email.trim(),
                password: draft.password,
                role,
                name: role === 'driver' ? draft.name.trim() : undefined,
                shopId: role === 'shop' ? draft.shopId : undefined,
                staffRoleId: role === 'admin' ? draft.staffRoleId : undefined,
              }),
            })
          : await api<AdminUserRow[]>(`/admin/users/${editingId}`, {
              method: 'PATCH',
              token,
              body: JSON.stringify({
                email: draft.email.trim(),
                ...(draft.password ? { password: draft.password } : {}),
                name:
                  role === 'driver' || role === 'shop'
                    ? draft.name.trim()
                    : undefined,
                shopId: role === 'shop' ? draft.shopId : undefined,
                staffRoleId: role === 'admin' ? draft.staffRoleId : undefined,
              }),
            });
      setRows(list.filter((u) => u.role === role));
      setMsg(editingId == null ? 'User created' : 'User updated');
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to save user',
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row: AdminUserRow, isActive: boolean) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const list = await api<AdminUserRow[]>(
        `/admin/users/${row.id}/active`,
        {
          method: 'PUT',
          token,
          body: JSON.stringify({ isActive }),
        },
      );
      setRows(list.filter((u) => u.role === role));
      setMsg(isActive ? `${row.email} activated` : `${row.email} deactivated`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update status',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(row: AdminUserRow) {
    if (!window.confirm(`Delete user “${row.email}”?`)) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const list = await api<AdminUserRow[]>(`/admin/users/${row.id}`, {
        method: 'DELETE',
        token,
      });
      setRows(list.filter((u) => u.role === role));
      setMsg('User deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setBusy(false);
    }
  }

  const editing = editingId != null;
  const showName = role === 'driver' || (editing && role === 'shop');
  const colCount =
    role === 'admin' ? 5 : role === 'shop' || role === 'driver' ? 5 : 4;

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        {copy.title}
      </h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{copy.section}</h2>
            <button
              type="button"
              className="hb-btn hb-btn-primary shrink-0 px-3.5 py-2 text-sm"
              onClick={openCreate}
            >
              {copy.addLabel}
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--hb-ink)]/55">{copy.blurb}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <label className="block min-w-0 text-sm">
              <span className="sr-only">Search</span>
              <input
                className="hb-input w-full"
                type="search"
                placeholder={
                  role === 'shop'
                    ? 'Search email, shop…'
                    : role === 'driver'
                      ? 'Search email, name…'
                      : 'Search email…'
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <SelectInput
              label="Status"
              showLabel={false}
              fullWidth
              className="min-w-0"
              value={statusFilter}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              onChange={(value) => setStatusFilter(value as StatusFilter)}
            />
          </div>

          <div className="hb-data-table-wrap mt-4">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  {role === 'driver' && <th>Name</th>}
                  {role === 'shop' && <th>Shop</th>}
                  {role === 'admin' && <th>Role</th>}
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold">{row.email}</td>
                    {role === 'driver' && (
                      <td className="text-[var(--hb-ink)]/65">
                        {row.name?.trim() || '—'}
                      </td>
                    )}
                    {role === 'shop' && (
                      <td className="text-[var(--hb-ink)]/65">
                        {row.shop?.name ?? row.name ?? '—'}
                      </td>
                    )}
                    {role === 'admin' && (
                      <td className="text-[var(--hb-ink)]/65">
                        {row.staffRole?.name ?? '—'}
                      </td>
                    )}
                    <td>
                      <StatusSwitch
                        checked={row.isActive}
                        disabled={busy}
                        label={`${row.email} ${row.isActive ? 'active' : 'inactive'}`}
                        onChange={(next) => void toggleActive(row, next)}
                      />
                    </td>
                    <td>
                      <div className="hb-data-table__actions">
                        <IconButton
                          label={`Edit ${row.email}`}
                          tooltip="Edit"
                          onClick={() => openEdit(row)}
                        >
                          {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                        </IconButton>
                        <IconButton
                          label={`Delete ${row.email}`}
                          tooltip="Delete"
                          tone="danger"
                          onClick={() => void removeRow(row)}
                        >
                          {UtilityIcons.trash({ size: ICON_SIZES.sm })}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={colCount}
                      className="text-[var(--hb-ink)]/55"
                    >
                      {rows.length === 0
                        ? 'No accounts yet.'
                        : 'No accounts match your search or filters.'}
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
        title={editing ? `Edit ${role}` : copy.addLabel}
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
                : editing
                  ? 'Save changes'
                  : copy.addLabel}
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
            Email
            <input
              className="hb-input mt-1.5"
              type="email"
              value={draft.email}
              onChange={(e) =>
                setDraft((d) => ({ ...d, email: e.target.value }))
              }
              autoComplete="off"
            />
          </label>
          {showName && (
            <label className="block text-sm">
              {role === 'shop' ? 'Shop name' : 'Name'}
              <input
                className="hb-input mt-1.5"
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder={
                  role === 'shop' ? 'Shop display name' : 'Driver display name'
                }
              />
            </label>
          )}
          <label className="block text-sm">
            {editing ? 'Password (optional)' : 'Password'}
            <PasswordInput
              wrapperClassName="mt-1.5"
              value={draft.password}
              onChange={(e) =>
                setDraft((d) => ({ ...d, password: e.target.value }))
              }
              minLength={editing ? undefined : 8}
              autoComplete="new-password"
              placeholder={editing ? 'Leave blank to keep current' : undefined}
            />
          </label>
          {role === 'shop' && (
            <SelectInput
              label="Shop"
              value={draft.shopId}
              options={shops.map((s) => ({
                value: s.id,
                label: s.name,
              }))}
              onChange={(value) => {
                const shop = shops.find((s) => s.id === value);
                setDraft((d) => ({
                  ...d,
                  shopId: value,
                  name: shop?.name ?? d.name,
                }));
              }}
              placeholder="Select shop"
            />
          )}
          {role === 'admin' && (
            <SelectInput
              label="Staff role"
              value={draft.staffRoleId}
              options={staffRoles.map((r) => ({
                value: r.id,
                label: r.name,
              }))}
              onChange={(value) =>
                setDraft((d) => ({ ...d, staffRoleId: value }))
              }
              placeholder="Select role"
            />
          )}
        </div>
      </Modal>
    </>
  );
}

export function StaffAccountsPage({ role }: { role: StaffRole }) {
  return (
    <RequireAuth>
      <RequireRole roles={['super_admin']}>
        <StaffAccountsInner role={role} />
      </RequireRole>
    </RequireAuth>
  );
}
