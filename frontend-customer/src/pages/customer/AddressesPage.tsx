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
import { useLocale } from '../../locale/LocaleContext';
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

const ADDRESS_LABEL_KEYS: Record<string, string> = {
  Home: 'addresses.label.home',
  Work: 'addresses.label.work',
  Family: 'addresses.label.family',
  Other: 'addresses.label.other',
};

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
  const { t } = useLocale();
  useDashboardTitle(t('addresses.title'));
  const { session, setSession } = useAuth();
  const token = session!.accessToken;

  const [list, setList] = useState<CustomerAddress[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(true));

  const areaOptions = useMemo(() => areas, [areas]);

  function displayLabel(label: string) {
    const key = ADDRESS_LABEL_KEYS[label];
    return key ? t(key) : label;
  }

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
        if (!cancelled) toastError(e, t('addresses.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, t]);

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
      toastError(e, t('addresses.saveFailed'));
      return false;
    } finally {
      setSaving(false);
    }
  }

  function startAdd() {
    if (list.length >= MAX_ADDRESSES) {
      toastError(t('addresses.maxReached', { max: MAX_ADDRESSES }));
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
      toastError(t('addresses.err.label'));
      return;
    }
    if (draft.line1.trim().length < 3) {
      toastError(t('addresses.err.address'));
      return;
    }
    if (!draft.eircode.trim()) {
      toastError(t('addresses.err.eircode'));
      return;
    }
    if (!isValidEircode(draft.eircode)) {
      toastError(t('addresses.err.eircodeInvalid'));
      return;
    }
    if (!draft.area_name || !areaOptions.includes(draft.area_name)) {
      toastError(t('addresses.err.location'));
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
      toastSuccess(
        draft.id ? t('addresses.toast.updated') : t('addresses.toast.saved'),
      );
      cancelEdit();
    }
  }

  async function setDefault(id: string) {
    const next = list.map((a) => ({ ...a, isDefault: a.id === id }));
    const ok = await persist(next);
    if (ok) toastSuccess(t('addresses.toast.default'));
  }

  async function remove(id: string) {
    let next = list.filter((a) => a.id !== id);
    if (next.length > 0 && !next.some((a) => a.isDefault)) {
      next = next.map((a, i) => ({ ...a, isDefault: i === 0 }));
    }
    const ok = await persist(next);
    if (ok) {
      toastSuccess(t('addresses.toast.removed'));
      if (draft.id === id) cancelEdit();
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-[var(--hb-ink)]/55">
        {t('addresses.loading')}
      </p>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--hb-ink)]/55">
            {t('addresses.intro')}
          </p>
        </div>
        {!editing ? (
          <button
            type="button"
            className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
            onClick={startAdd}
            disabled={saving || list.length >= MAX_ADDRESSES}
          >
            {t('addresses.addNew')}
          </button>
        ) : null}
      </div>

      {editing ? (
        <form
          onSubmit={onSaveDraft}
          className="hb-surface space-y-4 p-5 shadow-sm"
        >
          <h2 className="font-semibold">
            {draft.id ? t('addresses.editTitle') : t('addresses.newTitle')}
          </h2>

          <SelectInput
            label={t('addresses.label')}
            required
            value={draft.label}
            options={ADDRESS_LABELS.map((label) => ({
              value: label,
              label: displayLabel(label),
            }))}
            onChange={(value) => setDraft((d) => ({ ...d, label: value }))}
          />

          <TextInput
            label={t('addresses.address')}
            value={draft.line1}
            onChange={(e) => setDraft((d) => ({ ...d, line1: e.target.value }))}
            placeholder={t('addresses.addressPlaceholder')}
            required
            autoComplete="street-address"
          />

          <TextInput
            label={t('addresses.eircode')}
            value={draft.eircode}
            onChange={(e) =>
              setDraft((d) => ({ ...d, eircode: e.target.value.toUpperCase() }))
            }
            placeholder={t('addresses.eircodePlaceholder')}
            required
            autoComplete="postal-code"
          />

          <LocationSelect
            variant="field"
            label={t('addresses.deliveryLocation')}
            value={draft.area_name}
            options={areaOptions}
            onChange={(value) =>
              setDraft((d) => ({ ...d, area_name: value }))
            }
            required
            placeholder={
              areaOptions.length
                ? t('addresses.selectLocation')
                : t('addresses.noLocations')
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
            {t('addresses.setDefault')}
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              className="hb-btn hb-btn-primary h-9 px-4 text-sm"
              disabled={saving || areaOptions.length === 0}
            >
              {saving ? t('addresses.saving') : t('addresses.save')}
            </button>
            <button
              type="button"
              className="hb-btn hb-btn-ghost h-9 px-3 text-sm"
              onClick={cancelEdit}
              disabled={saving}
            >
              {t('addresses.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {list.length === 0 && !editing ? (
        <div className="hb-surface px-5 py-6 shadow-sm">
          <p className="text-sm text-[var(--hb-ink)]/70">
            {t('addresses.empty')}
          </p>
        </div>
      ) : list.length > 0 ? (
        <div className="hb-data-table-wrap">
          <table className="hb-data-table">
            <thead>
              <tr>
                <th>{t('addresses.col.label')}</th>
                <th>{t('addresses.col.address')}</th>
                <th>{t('addresses.col.eircode')}</th>
                <th>{t('addresses.col.location')}</th>
                <th>{t('addresses.col.default')}</th>
                <th style={{ textAlign: 'right' }}>
                  {t('addresses.col.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="font-semibold">{displayLabel(a.label)}</td>
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
                        aria-label={`${t('addresses.setDefault')} (${displayLabel(a.label)})`}
                      />
                      <span className="sr-only">{t('addresses.col.default')}</span>
                    </label>
                  </td>
                  <td>
                    <div className="hb-data-table__actions">
                      <IconButton
                        label={`${t('addresses.edit')} ${displayLabel(a.label)}`}
                        tooltip={t('addresses.edit')}
                        disabled={saving || editing}
                        onClick={() => startEdit(a)}
                      >
                        {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                      </IconButton>
                      <IconButton
                        label={`${t('addresses.remove')} ${displayLabel(a.label)}`}
                        tooltip={t('addresses.remove')}
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
