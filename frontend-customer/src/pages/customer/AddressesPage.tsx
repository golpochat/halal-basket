import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ADDRESS_LABELS,
  ICON_SIZES,
  IconButton,
  LocationSelect,
  SelectInput,
  TextInput,
  UtilityIcons,
  isValidEircode,
  normalizeEircode,
  toastError,
  toastSuccess,
  useDashboardTitle,
  type CustomerAddress,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';

type Profile = {
  addressList?: CustomerAddress[];
};

type CalendarRow = {
  id: string;
  areaName: string;
  deliveryDay: string;
};

const MAX_ADDRESSES = 10;

type Draft = {
  id: string | null;
  label: string;
  line1: string;
  eircode: string;
  area_name: string;
  isDefault: boolean;
};

function emptyDraft(makeDefault: boolean): Draft {
  return {
    id: null,
    label: ADDRESS_LABELS[0],
    line1: '',
    eircode: '',
    area_name: '',
    isDefault: makeDefault,
  };
}

function newAddressId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function CustomerAddressesPage() {
  useDashboardTitle('Addresses');
  const { session, setSession } = useAuth();
  const token = session!.accessToken;

  const [list, setList] = useState<CustomerAddress[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(true));

  const areaOptions = useMemo(() => areas, [areas]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api<Profile>('/auth/me', { token }),
      api<CalendarRow[]>('/delivery-calendar'),
    ])
      .then(([profile, calendar]) => {
        if (cancelled) return;
        setList(profile.addressList ?? []);
        const nextAreas = Array.from(
          new Set(calendar.map((r) => r.areaName).filter(Boolean)),
        ).sort();
        setAreas(nextAreas);
      })
      .catch((e: unknown) => {
        if (!cancelled) toastError(e, 'Could not load addresses');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function persist(next: CustomerAddress[]) {
    setSaving(true);
    try {
      const res = await api<{
        accessToken: string;
        user: {
          id: string;
          email: string;
          role: string;
          avatarUrl?: string | null;
        };
        profile: Profile;
      }>('/auth/me', {
        method: 'PATCH',
        token,
        body: JSON.stringify({ addressList: next }),
      });
      setList(res.profile.addressList ?? next);
      setSession({
        accessToken: res.accessToken,
        user: res.user,
      });
      return true;
    } catch (e) {
      toastError(e, 'Could not save addresses');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function startAdd() {
    if (list.length >= MAX_ADDRESSES) {
      toastError(`You can save up to ${MAX_ADDRESSES} addresses`);
      return;
    }
    setDraft(emptyDraft(list.length === 0));
    setEditing(true);
  }

  function startEdit(a: CustomerAddress) {
    setDraft({
      id: a.id,
      label: a.label,
      line1: a.line1,
      eircode: a.eircode,
      area_name: a.area_name,
      isDefault: Boolean(a.isDefault),
    });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft(emptyDraft(list.length === 0));
  }

  async function onSaveDraft(e: FormEvent) {
    e.preventDefault();
    if (!draft.label.trim()) {
      toastError('Please choose a label');
      return;
    }
    if (draft.line1.trim().length < 3) {
      toastError('Please enter an address');
      return;
    }
    if (!draft.eircode.trim()) {
      toastError('Please enter an Eircode');
      return;
    }
    if (!isValidEircode(draft.eircode)) {
      toastError('Enter a valid Irish Eircode (e.g. A65 F4E2)');
      return;
    }
    if (!draft.area_name || !areaOptions.includes(draft.area_name)) {
      toastError('Choose a delivery location from the list');
      return;
    }

    const id = draft.id ?? newAddressId();
    const entry: CustomerAddress = {
      id,
      label: draft.label,
      line1: draft.line1.trim(),
      eircode: normalizeEircode(draft.eircode),
      area_name: draft.area_name,
      isDefault: draft.isDefault || list.length === 0,
    };

    let next: CustomerAddress[];
    if (draft.id) {
      next = list.map((a) => (a.id === draft.id ? entry : a));
    } else {
      next = [...list, entry];
    }

    if (entry.isDefault) {
      next = next.map((a) => ({ ...a, isDefault: a.id === entry.id }));
    } else if (!next.some((a) => a.isDefault) && next[0]) {
      next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
    }

    const ok = await persist(next);
    if (ok) {
      toastSuccess(draft.id ? 'Address updated' : 'Address saved');
      cancelEdit();
    }
  }

  async function setDefault(id: string) {
    const next = list.map((a) => ({ ...a, isDefault: a.id === id }));
    const ok = await persist(next);
    if (ok) toastSuccess('Default address updated');
  }

  async function remove(id: string) {
    let next = list.filter((a) => a.id !== id);
    if (next.length > 0 && !next.some((a) => a.isDefault)) {
      next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
    }
    const ok = await persist(next);
    if (ok) {
      toastSuccess('Address removed');
      if (draft.id === id) cancelEdit();
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--hb-ink)]/55">Loading addresses…</p>;
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--hb-ink)]/55">
            Save delivery addresses for checkout. Only one can be the default.
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
            onClick={startAdd}
            disabled={saving || list.length >= MAX_ADDRESSES}
          >
            + Add New
          </button>
        ) : null}
      </div>

      {editing ? (
        <form
          onSubmit={onSaveDraft}
          className="hb-surface space-y-4 p-5 shadow-sm"
        >
          <h2 className="font-semibold">
            {draft.id ? 'Edit address' : 'New address'}
          </h2>

          <SelectInput
            label="Label"
            required
            value={draft.label}
            options={ADDRESS_LABELS.map((label) => ({
              value: label,
              label,
            }))}
            onChange={(value) => setDraft((d) => ({ ...d, label: value }))}
          />

          <TextInput
            label="Address"
            value={draft.line1}
            onChange={(e) => setDraft((d) => ({ ...d, line1: e.target.value }))}
            placeholder="House number and street"
            required
            autoComplete="street-address"
          />

          <TextInput
            label="Eircode"
            value={draft.eircode}
            onChange={(e) =>
              setDraft((d) => ({ ...d, eircode: e.target.value.toUpperCase() }))
            }
            placeholder="A65 F4E2"
            required
            autoComplete="postal-code"
          />

          <LocationSelect
            variant="field"
            label="Delivery location"
            value={draft.area_name}
            options={areaOptions}
            onChange={(value) =>
              setDraft((d) => ({ ...d, area_name: value }))
            }
            required
            placeholder={
              areaOptions.length ? 'Select location' : 'No locations configured'
            }
            disabled={areaOptions.length === 0}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.isDefault || list.length === 0}
              disabled={list.length === 0 && !draft.id}
              onChange={(e) =>
                setDraft((d) => ({ ...d, isDefault: e.target.checked }))
              }
            />
            Set as default address
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="hb-btn hb-btn-primary h-9 px-4 text-sm"
              disabled={saving || areaOptions.length === 0}
            >
              {saving ? 'Saving…' : 'Save address'}
            </button>
            <button
              type="button"
              className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
              onClick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {list.length === 0 && !editing ? (
        <div className="hb-surface px-5 py-6 shadow-sm">
          <p className="text-sm text-[var(--hb-ink)]/70">
            No saved addresses yet. Add one so checkout can use your default.
          </p>
        </div>
      ) : list.length > 0 ? (
        <div className="hb-data-table-wrap">
          <table className="hb-data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Address</th>
                <th>Eircode</th>
                <th>Location</th>
                <th>Default</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{a.label}</td>
                  <td>{a.line1}</td>
                  <td className="whitespace-nowrap">{a.eircode}</td>
                  <td>{a.area_name}</td>
                  <td>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="default-address"
                        checked={Boolean(a.isDefault)}
                        disabled={saving}
                        onChange={() => {
                          if (!a.isDefault) void setDefault(a.id);
                        }}
                        aria-label={`Set ${a.label} as default address`}
                      />
                      <span className="sr-only">Default</span>
                    </label>
                  </td>
                  <td>
                    <div className="hb-data-table__actions">
                      <IconButton
                        label={`Edit ${a.label} address`}
                        tooltip="Edit"
                        disabled={saving || editing}
                        onClick={() => startEdit(a)}
                      >
                        {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                      </IconButton>
                      <IconButton
                        label={`Remove ${a.label} address`}
                        tooltip="Remove"
                        tone="danger"
                        disabled={saving}
                        onClick={() => void remove(a.id)}
                      >
                        {UtilityIcons.trash({ size: ICON_SIZES.sm })}
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
