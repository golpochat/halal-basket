import { useEffect, useRef, useState } from 'react';
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

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80';

const FALLBACK_TITLE = 'Halal groceries delivered or ready for pickup';
const FALLBACK_SUBTITLE = 'From trusted local halal shops in Dublin';

type BrandingItem = {
  id: string;
  heroBackgroundUrl: string | null;
  heroBackgroundPath: string;
  heroTitle: string;
  heroSubtitle: string;
  isPlatformDefault: boolean;
  previewImageUrl: string;
};

type BrandingAdminResponse = {
  activeId: string;
  items: BrandingItem[];
};

type Draft = {
  heroTitle: string;
  heroSubtitle: string;
  heroBackgroundUrl: string;
  heroBackgroundPath: string;
};

function emptyDraft(): Draft {
  return {
    heroTitle: FALLBACK_TITLE,
    heroSubtitle: FALLBACK_SUBTITLE,
    heroBackgroundUrl: '',
    heroBackgroundPath: '',
  };
}

function isValidImageUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AdminBrandingPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['branding.read']}>
        <BrandingInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function BrandingInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('branding.write');
  const fileRef = useRef<HTMLInputElement>(null);
  const [activeId, setActiveId] = useState('');
  const [items, setItems] = useState<BrandingItem[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [modalError, setModalError] = useState('');
  const [uploading, setUploading] = useState(false);

  function applyAdmin(data: BrandingAdminResponse) {
    setActiveId(data.activeId);
    setItems(data.items);
  }

  async function refresh() {
    const data = await api<BrandingAdminResponse>(
      '/admin/platform/branding',
      { token },
    );
    applyAdmin(data);
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

  function openEdit(item: BrandingItem) {
    if (item.isPlatformDefault) return;
    setEditingId(item.id);
    setDraft({
      heroTitle: item.heroTitle,
      heroSubtitle: item.heroSubtitle,
      heroBackgroundUrl: item.heroBackgroundUrl ?? '',
      heroBackgroundPath: item.heroBackgroundPath || '',
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
    if (!draft.heroTitle.trim() || !draft.heroSubtitle.trim()) {
      setModalError('Title and subtitle are required.');
      return;
    }
    const urlForSave =
      draft.heroBackgroundPath.trim() || draft.heroBackgroundUrl.trim();
    if (
      draft.heroBackgroundUrl.trim() &&
      !draft.heroBackgroundPath.trim() &&
      !isValidImageUrl(draft.heroBackgroundUrl)
    ) {
      setModalError('Please paste a valid http(s) image URL.');
      return;
    }

    setBusy(true);
    setError('');
    setMsg('');
    setModalError('');
    try {
      const body = {
        heroTitle: draft.heroTitle.trim(),
        heroSubtitle: draft.heroSubtitle.trim(),
        heroBackgroundUrl: urlForSave,
      };
      const data =
        editingId == null
          ? await api<BrandingAdminResponse>(
              '/admin/platform/branding/items',
              {
                method: 'POST',
                token,
                body: JSON.stringify(body),
              },
            )
          : await api<BrandingAdminResponse>(
              `/admin/platform/branding/items/${editingId}`,
              {
                method: 'PATCH',
                token,
                body: JSON.stringify(body),
              },
            );
      applyAdmin(data);
      setMsg(editingId == null ? 'Branding added' : 'Branding updated');
      closeModal();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to save branding',
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: BrandingItem) {
    if (item.isPlatformDefault) return;
    if (!window.confirm(`Delete branding “${item.heroTitle}”?`)) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const data = await api<BrandingAdminResponse>(
        `/admin/platform/branding/items/${item.id}`,
        { method: 'DELETE', token },
      );
      applyAdmin(data);
      setMsg('Branding deleted');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete branding',
      );
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(id: string) {
    if (id === activeId) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const data = await api<BrandingAdminResponse>(
        '/admin/platform/branding/active',
        {
          method: 'PATCH',
          token,
          body: JSON.stringify({ activeId: id }),
        },
      );
      applyAdmin(data);
      setMsg('Live hero updated');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to set live hero',
      );
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setModalError('Please upload a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 2_000_000) {
      setModalError('That image is too large. Please use a file under 2MB.');
      return;
    }
    setUploading(true);
    setModalError('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await api<{ url: string; path: string }>(
        '/admin/platform/branding/upload',
        { method: 'POST', token, body },
      );
      setDraft((d) => ({
        ...d,
        heroBackgroundUrl: res.url,
        heroBackgroundPath: res.path,
      }));
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Failed to upload image',
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const previewSrc =
    draft.heroBackgroundUrl.trim() ||
    draft.heroBackgroundPath.trim() ||
    DEFAULT_HERO_IMAGE;

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Branding
      </h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <section className="hb-surface mb-6 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Landing heroes</h2>
              <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
                Manage hero variants. The selected default is shown on the
                customer homepage. Platform default cannot be edited or
                deleted.
              </p>
            </div>
            {canWrite ? (
              <button
                type="button"
                className="hb-btn hb-btn-primary shrink-0 px-3.5 py-2 text-sm"
                onClick={openCreate}
              >
                Add branding
              </button>
            ) : null}
          </div>

          <div className="hb-data-table-wrap mt-4">
            <table className="hb-data-table">
              <thead>
                <tr>
                  <th>Default</th>
                  <th>Preview</th>
                  <th>Title</th>
                  <th>Subtitle</th>
                  <th>Type</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="radio"
                        name="branding-default"
                        checked={item.id === activeId}
                        disabled={!canWrite || busy}
                        aria-label={`Set ${item.heroTitle} as live hero`}
                        onChange={() => void setDefault(item.id)}
                      />
                    </td>
                    <td>
                      <div
                        className="h-12 w-20 overflow-hidden rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.1)] bg-cover bg-center"
                        style={{
                          backgroundImage: `url("${item.previewImageUrl}")`,
                        }}
                        aria-hidden
                      />
                    </td>
                    <td className="font-semibold">{item.heroTitle}</td>
                    <td className="max-w-[16rem] truncate text-[var(--hb-ink)]/65">
                      {item.heroSubtitle}
                    </td>
                    <td>
                      {item.isPlatformDefault ? (
                        <span className="text-xs font-semibold text-[var(--hb-ink)]/55">
                          Platform default
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--hb-ink)]/55">
                          Custom
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="hb-data-table__actions">
                        <IconButton
                          label={`Edit ${item.heroTitle}`}
                          tooltip={
                            item.isPlatformDefault
                              ? 'Platform default cannot be edited'
                              : 'Edit'
                          }
                          disabled={!canWrite || item.isPlatformDefault || busy}
                          onClick={() => openEdit(item)}
                        >
                          {UtilityIcons.edit({ size: ICON_SIZES.sm })}
                        </IconButton>
                        <IconButton
                          label={`Delete ${item.heroTitle}`}
                          tooltip={
                            item.isPlatformDefault
                              ? 'Platform default cannot be deleted'
                              : 'Delete'
                          }
                          tone="danger"
                          disabled={!canWrite || item.isPlatformDefault || busy}
                          onClick={() => void removeItem(item)}
                        >
                          {UtilityIcons.trash({ size: ICON_SIZES.sm })}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-[var(--hb-ink)]/55">
                      No branding items yet.
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
        title={editingId == null ? 'Add branding' : 'Edit branding'}
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
              disabled={busy || uploading}
              onClick={() => void saveModal()}
            >
              {busy
                ? 'Saving…'
                : editingId == null
                  ? 'Add branding'
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

          <div
            className="relative overflow-hidden rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.1)]"
            style={{
              background: `url("${previewSrc}") center/cover`,
              minHeight: '9rem',
            }}
            aria-label="Hero preview"
          >
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/20"
              aria-hidden
            />
            <div className="relative z-10 px-4 py-6">
              <p className="font-display text-lg font-bold text-white">
                {draft.heroTitle.trim() || FALLBACK_TITLE}
              </p>
              <p className="mt-1 text-sm text-white/85">
                {draft.heroSubtitle.trim() || FALLBACK_SUBTITLE}
              </p>
            </div>
          </div>

          <label className="block text-sm">
            Title
            <input
              className="hb-input mt-1.5"
              value={draft.heroTitle}
              maxLength={120}
              onChange={(e) =>
                setDraft((d) => ({ ...d, heroTitle: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            Subtitle
            <input
              className="hb-input mt-1.5"
              value={draft.heroSubtitle}
              maxLength={200}
              onChange={(e) =>
                setDraft((d) => ({ ...d, heroSubtitle: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            Image URL
            <input
              className="hb-input mt-1.5"
              placeholder="https://…/hero.jpg"
              value={draft.heroBackgroundUrl}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  heroBackgroundUrl: e.target.value,
                  heroBackgroundPath: '',
                }))
              }
            />
            <span className="mt-1 block text-xs text-[var(--hb-ink)]/45">
              Leave empty to use the stock platform image.
            </span>
          </label>
          <div className="flex justify-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => void onUpload(e.target.files?.[0])}
            />
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3.5 py-2 text-sm"
              disabled={uploading || busy}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
