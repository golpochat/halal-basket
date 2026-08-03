import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

type Permission = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  groupName: string;
};

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
  permissionKeys: string[];
};

type TabId = 'roles' | 'permissions';

type MetaDraft = {
  name: string;
  description: string;
};

const SUPER_ADMIN_SLUG = 'super-admin';

function isSuperAdminRole(row: RoleRow) {
  return row.slug === SUPER_ADMIN_SLUG;
}

function codeOf(slug: string) {
  return slug.replace(/-/g, '_').toUpperCase();
}

function sameKeys(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((k) => set.has(k));
}

function KeyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M15.5 8a3.5 3.5 0 1 0-3.38 3.49L8 15.61V18h2.5l1.1-1.1 1.4 1.4 1.4-1.4-1.4-1.4L15.12 13A3.5 3.5 0 0 0 15.5 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="15.5" cy="8" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function AdminRolesPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['roles.read']}>
        <RolesInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function RolesInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('roles.write');
  const base =
    session?.user.role === 'super_admin' ? '/super-admin' : '/admin';
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tab, setTab] = useState<TabId>('roles');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftKeys, setDraftKeys] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [metaDraft, setMetaDraft] = useState<MetaDraft>({
    name: '',
    description: '',
  });
  const [modalError, setModalError] = useState('');
  const [editingSystem, setEditingSystem] = useState(false);

  const configurableRoles = useMemo(
    () => roles.filter((r) => !isSuperAdminRole(r)),
    [roles],
  );

  const customCount = useMemo(
    () => roles.filter((r) => !r.isSystem).length,
    [roles],
  );

  const selectedRole = useMemo(
    () => configurableRoles.find((r) => r.id === selectedRoleId) ?? null,
    [configurableRoles, selectedRoleId],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of permissions) {
      const list = map.get(p.groupName) ?? [];
      list.push(p);
      map.set(p.groupName, list);
    }
    return [...map.entries()];
  }, [permissions]);

  const groupNames = useMemo(() => grouped.map(([name]) => name), [grouped]);

  const activePerms = useMemo(() => {
    const entry = grouped.find(([name]) => name === activeGroup);
    return entry?.[1] ?? [];
  }, [grouped, activeGroup]);

  const dirty = useMemo(() => {
    if (!selectedRole) return false;
    return !sameKeys(draftKeys, selectedRole.permissionKeys);
  }, [draftKeys, selectedRole]);

  async function refresh() {
    const [roleList, permList] = await Promise.all([
      api<RoleRow[]>('/admin/rbac/roles', { token }),
      api<Permission[]>('/admin/rbac/permissions', { token }),
    ]);
    setRoles(roleList);
    setPermissions(permList);
    return roleList;
  }

  useEffect(() => {
    refresh()
      .then((list) => {
        const first =
          list.find((r) => r.slug === 'admin') ??
          list.find((r) => !isSuperAdminRole(r)) ??
          null;
        if (first) {
          setSelectedRoleId((cur) => cur ?? first.id);
          setDraftKeys((cur) =>
            cur.length ? cur : [...first.permissionKeys],
          );
        }
      })
      .catch((e: Error) => setError(e.message));
  }, [token]);

  useEffect(() => {
    if (!activeGroup && groupNames.length > 0) {
      setActiveGroup(groupNames[0]);
    } else if (activeGroup && !groupNames.includes(activeGroup) && groupNames[0]) {
      setActiveGroup(groupNames[0]);
    }
  }, [groupNames, activeGroup]);

  function discardDirtyIfNeeded() {
    if (dirty) {
      setMsg('Unsaved permission changes discarded');
    }
  }

  function loadRoleDraft(row: RoleRow) {
    setSelectedRoleId(row.id);
    setDraftKeys([...row.permissionKeys]);
  }

  function openPermissionsFor(row: RoleRow) {
    if (isSuperAdminRole(row)) return;
    discardDirtyIfNeeded();
    loadRoleDraft(row);
    setTab('permissions');
  }

  function switchTab(next: TabId) {
    if (next === tab) return;
    if (next === 'roles' && dirty) {
      discardDirtyIfNeeded();
      if (selectedRole) setDraftKeys([...selectedRole.permissionKeys]);
    }
    setTab(next);
  }

  function changeSelectedRole(id: string) {
    const row = configurableRoles.find((r) => r.id === id);
    if (!row || row.id === selectedRoleId) return;
    discardDirtyIfNeeded();
    loadRoleDraft(row);
  }

  function openCreate() {
    setEditingId(null);
    setEditingSystem(false);
    setMetaDraft({ name: '', description: '' });
    setModalError('');
    setModalOpen(true);
  }

  function openEditMeta(row: RoleRow) {
    if (isSuperAdminRole(row)) return;
    setEditingId(row.id);
    setEditingSystem(row.isSystem);
    setMetaDraft({
      name: row.name,
      description: row.description ?? '',
    });
    setModalError('');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setModalError('');
  }

  function togglePermission(key: string) {
    setDraftKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  }

  function toggleGroup(keys: string[], on: boolean) {
    setDraftKeys((current) => {
      const set = new Set(current);
      for (const k of keys) {
        if (on) set.add(k);
        else set.delete(k);
      }
      return [...set];
    });
  }

  async function saveModal() {
    if (!metaDraft.name.trim()) {
      setModalError('Name is required.');
      return;
    }
    setBusy(true);
    setError('');
    setMsg('');
    setModalError('');
    try {
      if (editingId == null) {
        const list = await api<RoleRow[]>('/admin/rbac/roles', {
          method: 'POST',
          token,
          body: JSON.stringify({
            name: metaDraft.name.trim(),
            description: metaDraft.description.trim() || undefined,
            permissionKeys: [],
          }),
        });
        setRoles(list);
        const created =
          list.find(
            (r) =>
              r.name.toLowerCase() === metaDraft.name.trim().toLowerCase() &&
              !r.isSystem,
          ) ?? list.filter((r) => !r.isSystem).at(-1);
        closeModal();
        setMsg('Role created — assign permissions below');
        if (created) {
          loadRoleDraft(created);
          setTab('permissions');
        }
      } else {
        const list = await api<RoleRow[]>(`/admin/rbac/roles/${editingId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            ...(editingSystem ? {} : { name: metaDraft.name.trim() }),
            description: metaDraft.description.trim() || undefined,
          }),
        });
        setRoles(list);
        setMsg('Role updated');
        closeModal();
      }
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to save role',
      );
    } finally {
      setBusy(false);
    }
  }

  async function savePermissions() {
    if (!selectedRole) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const list = await api<RoleRow[]>(
        `/admin/rbac/roles/${selectedRole.id}/permissions`,
        {
          method: 'PUT',
          token,
          body: JSON.stringify({ permissionKeys: draftKeys }),
        },
      );
      setRoles(list);
      const updated = list.find((r) => r.id === selectedRole.id);
      if (updated) setDraftKeys([...updated.permissionKeys]);
      setMsg(`Permissions saved for ${selectedRole.name}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save permissions',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(row: RoleRow) {
    if (row.isSystem) return;
    if (!window.confirm(`Delete role “${row.name}”?`)) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const list = await api<RoleRow[]>(`/admin/rbac/roles/${row.id}`, {
        method: 'DELETE',
        token,
      });
      setRoles(list);
      if (selectedRoleId === row.id) {
        const next =
          list.find((r) => r.slug === 'admin') ??
          list.find((r) => !isSuperAdminRole(r)) ??
          null;
        if (next) loadRoleDraft(next);
        else {
          setSelectedRoleId(null);
          setDraftKeys([]);
        }
      }
      setMsg('Role deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete role');
    } finally {
      setBusy(false);
    }
  }

  const scopeKeys = activePerms.map((p) => p.key);
  const allInScope =
    scopeKeys.length > 0 && scopeKeys.every((k) => draftKeys.includes(k));
  const someInScope = scopeKeys.some((k) => draftKeys.includes(k));

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Roles & permissions
      </h1>
      <p className="mt-2 text-sm text-[var(--hb-ink)]/60">
        Define who can do what — create roles and assign permissions across the
        platform.
      </p>

      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface overflow-hidden shadow-sm">
          <div className="flex gap-6 border-b border-[rgba(26,92,58,0.12)] px-5">
            {(
              [
                { id: 'roles', label: 'Roles' },
                { id: 'permissions', label: 'Permissions' },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`relative -mb-px py-3.5 text-sm font-semibold transition ${
                    active
                      ? 'text-[var(--hb-green)]'
                      : 'text-[var(--hb-ink)]/50 hover:text-[var(--hb-ink)]'
                  }`}
                  onClick={() => switchTab(item.id)}
                >
                  {item.label}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--hb-green)]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {tab === 'roles' ? (
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">All roles</h2>
                  <p className="mt-0.5 text-sm text-[var(--hb-ink)]/55">
                    {roles.length} role{roles.length === 1 ? '' : 's'} ·{' '}
                    {customCount} custom
                  </p>
                </div>
                <button
                  type="button"
                  className="hb-btn hb-btn-primary shrink-0 px-3.5 py-2 text-sm"
                  disabled={!canWrite}
                  onClick={openCreate}
                >
                  Create custom role
                </button>
              </div>

              <div className="hb-data-table-wrap mt-4">
                <table className="hb-data-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Users</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((row) => {
                      const code = codeOf(row.slug);
                      const selected =
                        !isSuperAdminRole(row) && row.id === selectedRoleId;
                      return (
                        <tr
                          key={row.id}
                          className={
                            selected
                              ? 'bg-[rgba(26,92,58,0.04)]'
                              : undefined
                          }
                        >
                          <td>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{row.name}</span>
                              {selected ? (
                                <span className="rounded-full bg-[rgba(26,92,58,0.12)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--hb-green)]">
                                  Selected
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-[var(--hb-ink)]/45">
                              {row.isSystem
                                ? `System role: ${code}`
                                : row.description || row.slug}
                            </div>
                          </td>
                          <td>
                            <code className="text-xs font-semibold tracking-wide text-[var(--hb-ink)]/70">
                              {code}
                            </code>
                          </td>
                          <td>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                row.isSystem
                                  ? 'bg-[rgba(26,92,58,0.12)] text-[var(--hb-green)]'
                                  : 'bg-[rgba(26,92,58,0.08)] text-[var(--hb-ink)]/65'
                              }`}
                            >
                              {row.isSystem ? 'System' : 'Custom'}
                            </span>
                          </td>
                          <td className="text-[var(--hb-ink)]/65">
                            {row.userCount}{' '}
                            {row.userCount === 1 ? 'user' : 'users'}
                          </td>
                          <td>
                            <div className="hb-data-table__actions">
                              {isSuperAdminRole(row) ? (
                                <span className="pr-1 text-sm font-medium text-[var(--hb-ink)]/45">
                                  Full access
                                </span>
                              ) : (
                                <>
                                  <IconButton
                                    label={`Manage permissions for ${row.name}`}
                                    tooltip="Manage permissions"
                                    onClick={() => openPermissionsFor(row)}
                                  >
                                    <KeyIcon size={ICON_SIZES.sm} />
                                  </IconButton>
                                  <IconButton
                                    label={`Edit ${row.name}`}
                                    tooltip="Edit"
                                    disabled={!canWrite}
                                    onClick={() => openEditMeta(row)}
                                  >
                                    {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                                  </IconButton>
                                  {!row.isSystem ? (
                                    <IconButton
                                      label={`Delete ${row.name}`}
                                      tooltip="Delete"
                                      tone="danger"
                                      disabled={!canWrite}
                                      onClick={() => void removeRow(row)}
                                    >
                                      {UtilityIcons.trash({
                                        size: ICON_SIZES.sm,
                                      })}
                                    </IconButton>
                                  ) : null}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {roles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-[var(--hb-ink)]/55">
                          No roles yet. Run database seed to create system
                          roles.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-xs text-[var(--hb-ink)]/45">
                Select a role to configure its permissions in the Permissions
                tab.
              </p>

              <div className="mt-6 rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.12)] bg-[rgba(26,92,58,0.04)] p-4">
                <h3 className="text-sm font-semibold">Portal access</h3>
                <p className="mt-1 text-sm text-[var(--hb-ink)]/60">
                  Customer, Shop, and Driver are portal roles (which app someone
                  can sign into). They are not assigned permissions here —
                  only Admin users get a staff role from the table above.
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      {
                        code: 'CUSTOMER',
                        name: 'Customer',
                        detail: 'Self-register on the customer app',
                      },
                      {
                        code: 'SHOP',
                        name: 'Shop',
                        detail: 'Managed under Shop logins',
                        to: `${base}/shop-users`,
                      },
                      {
                        code: 'DRIVER',
                        name: 'Driver',
                        detail: 'Managed under Driver logins',
                        to: `${base}/drivers`,
                      },
                    ] as const
                  ).map((row) => (
                    <li
                      key={row.code}
                      className="rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.1)] bg-white px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{row.name}</span>
                        <code className="text-[10px] font-semibold tracking-wide text-[var(--hb-ink)]/45">
                          {row.code}
                        </code>
                      </div>
                      <p className="mt-1 text-xs text-[var(--hb-ink)]/50">
                        {'to' in row && row.to ? (
                          <Link
                            to={row.to}
                            className="font-medium text-[var(--hb-green)] hover:underline"
                          >
                            {row.detail}
                          </Link>
                        ) : (
                          row.detail
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <div className="rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.14)] bg-[rgba(26,92,58,0.06)] px-4 py-3 text-sm text-[var(--hb-ink)]/75">
                Super Admin is not listed here — that role always has full
                platform access and cannot be restricted. Configure Admin and
                custom roles below.
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-[14rem] flex-1">
                  <SelectInput
                    label="Role"
                    value={selectedRoleId ?? ''}
                    options={configurableRoles.map((r) => ({
                      value: r.id,
                      label: `${r.name} (${codeOf(r.slug)})`,
                    }))}
                    onChange={changeSelectedRole}
                    placeholder="Select a role"
                  />
                </div>
                <button
                  type="button"
                  className="hb-btn hb-btn-primary shrink-0 px-3.5 py-2 text-sm"
                  disabled={!canWrite || busy || !selectedRole || !dirty}
                  onClick={() => void savePermissions()}
                >
                  {busy ? 'Saving…' : 'Save permissions'}
                </button>
              </div>

              {selectedRole?.isSystem ? (
                <div className="mt-4 rounded-[var(--hb-radius)] border border-[rgba(180,140,40,0.35)] bg-[rgba(255,214,102,0.18)] px-4 py-3 text-sm text-[var(--hb-ink)]/75">
                  System roles can only be changed by a super-admin with
                  roles.write.
                </div>
              ) : null}

              {!selectedRole ? (
                <p className="mt-6 text-sm text-[var(--hb-ink)]/55">
                  Create or select a role to edit permissions.
                </p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap gap-1 border-b border-[rgba(26,92,58,0.12)]">
                    {groupNames.map((name) => {
                      const active = name === activeGroup;
                      return (
                        <button
                          key={name}
                          type="button"
                          className={`relative -mb-px px-3 py-2.5 text-sm font-semibold transition ${
                            active
                              ? 'text-[var(--hb-green)]'
                              : 'text-[var(--hb-ink)]/50 hover:text-[var(--hb-ink)]'
                          }`}
                          onClick={() => setActiveGroup(name)}
                        >
                          {name}
                          {active ? (
                            <span
                              aria-hidden
                              className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[var(--hb-green)]"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{activeGroup}</h3>
                        <p className="mt-0.5 text-sm text-[var(--hb-ink)]/55">
                          Toggle permissions in this group for{' '}
                          {selectedRole.name}.
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--hb-green)]"
                          checked={allInScope}
                          disabled={!canWrite}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = someInScope && !allInScope;
                            }
                          }}
                          onChange={() =>
                            toggleGroup(scopeKeys, !allInScope)
                          }
                        />
                        All in scope
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {activePerms.map((p) => {
                        const on = draftKeys.includes(p.key);
                        return (
                          <label
                            key={p.key}
                            className={`flex cursor-pointer items-start gap-3 rounded-[var(--hb-radius)] border p-3.5 transition ${
                              on
                                ? 'border-[rgba(26,92,58,0.35)] bg-[rgba(26,92,58,0.05)]'
                                : 'border-[rgba(26,92,58,0.12)] bg-white hover:border-[rgba(26,92,58,0.25)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--hb-green)]"
                              checked={on}
                              disabled={!canWrite}
                              onChange={() => togglePermission(p.key)}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-[var(--hb-ink)]">
                                {p.name}
                              </span>
                              <span className="mt-0.5 block truncate font-mono text-xs text-[var(--hb-ink)]/45">
                                {p.key}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                      {activePerms.length === 0 && (
                        <p className="text-sm text-[var(--hb-ink)]/55 sm:col-span-2 lg:col-span-3">
                          No permissions in this group.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={modalOpen}
        title={editingId == null ? 'Create custom role' : 'Edit role'}
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
              disabled={!canWrite || busy}
              onClick={() => void saveModal()}
            >
              {busy
                ? 'Saving…'
                : editingId == null
                  ? 'Create role'
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
              value={metaDraft.name}
              disabled={!canWrite || editingSystem}
              onChange={(e) =>
                setMetaDraft((d) => ({ ...d, name: e.target.value }))
              }
              placeholder="e.g. Catalogue editor"
            />
          </label>
          <label className="block text-sm">
            Description
            <input
              className="hb-input mt-1.5"
              value={metaDraft.description}
              disabled={!canWrite}
              onChange={(e) =>
                setMetaDraft((d) => ({ ...d, description: e.target.value }))
              }
              placeholder="Optional"
            />
          </label>
          {editingId == null ? (
            <p className="text-xs text-[var(--hb-ink)]/50">
              After creating the role, you&apos;ll assign permissions on the
              Permissions tab.
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
