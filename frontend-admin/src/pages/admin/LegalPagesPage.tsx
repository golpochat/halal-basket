import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal, renderMarkdownToReact } from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';

type LegalRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  bodyMarkdown: string;
  sortOrder: number;
  isPublished: boolean;
  showInFooter: boolean;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
};

const SEEDED = new Set(['privacy', 'terms', 'cookies', 'refunds']);

function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || 'policy';
}

function uniqueSlug(
  title: string,
  rows: LegalRow[],
  excludeId?: string | null,
): string {
  const base = slugifyTitle(title);
  let candidate = base;
  let n = 2;
  while (
    rows.some((r) => r.slug === candidate && r.id !== excludeId)
  ) {
    const suffix = `-${n++}`;
    candidate = `${base.slice(0, Math.max(1, 64 - suffix.length))}${suffix}`;
  }
  return candidate;
}

export function AdminLegalPagesPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['legal.read']}>
        <LegalInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function LegalInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('legal.write');

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [rows, setRows] = useState<LegalRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [bodyMarkdown, setBodyMarkdown] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [showInFooter, setShowInFooter] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) ?? null,
    [rows, selectedId],
  );
  const slugLocked = Boolean(selected && SEEDED.has(selected.slug) && !creating);

  const generatedSlug = useMemo(() => {
    if (slugLocked && selected) return selected.slug;
    return uniqueSlug(title, rows, creating ? null : selectedId);
  }, [title, rows, creating, selectedId, slugLocked, selected]);

  async function refresh() {
    const list = await api<LegalRow[]>('/admin/legal', { token });
    setRows(list);
    return list;
  }

  useEffect(() => {
    refresh()
      .then((list) => {
        if (list[0]) loadDoc(list[0]);
      })
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function loadDoc(row: LegalRow) {
    setCreating(false);
    setSelectedId(row.id);
    setTitle(row.title);
    setSubtitle(row.subtitle ?? '');
    setBodyMarkdown(row.bodyMarkdown);
    setSortOrder(row.sortOrder);
    setShowInFooter(row.showInFooter);
    setIsPublished(row.isPublished);
    setPreviewOpen(false);
  }

  function startCreate() {
    if (!canWrite) return;
    setCreating(true);
    setSelectedId(null);
    setTitle('');
    setSubtitle('');
    setBodyMarkdown('## Heading\n\nWrite your policy in Markdown…');
    setSortOrder(100);
    setShowInFooter(true);
    setIsPublished(false);
    setPreviewOpen(false);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const slug = slugLocked && selected ? selected.slug : generatedSlug;
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        bodyMarkdown,
        sortOrder,
        showInFooter,
        isPublished,
        ...(slugLocked ? {} : { slug }),
      };

      if (creating) {
        const created = await api<LegalRow>('/admin/legal', {
          method: 'POST',
          token,
          body: JSON.stringify({ ...payload, slug }),
        });
        setMsg('Legal page created');
        const list = await refresh();
        const row = list.find((r) => r.id === created.id) ?? created;
        loadDoc(row);
      } else if (selectedId) {
        await api(`/admin/legal/${selectedId}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify(payload),
        });
        setMsg('Legal page saved');
        const list = await refresh();
        const row = list.find((r) => r.id === selectedId);
        if (row) loadDoc(row);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function unpublishOrDelete() {
    if (!canWrite || !selectedId || !selected) return;
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api(`/admin/legal/${selectedId}`, {
        method: 'DELETE',
        token,
      });
      setMsg(
        SEEDED.has(selected.slug)
          ? 'Seeded page unpublished'
          : 'Legal page deleted',
      );
      const list = await refresh();
      if (list[0]) loadDoc(list[0]);
      else startCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Legal pages
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--hb-ink)]/60">
        Edit storefront policies (Markdown). Seeded templates are for the Dublin
        pilot — have counsel review before go-live. GDPR export/erase remains
        under Privacy.
      </p>

      <div className="mt-6">
        <Flash error={error} msg={msg} />

        <div
          className="flex flex-wrap gap-2 border-b border-[rgba(26,92,58,0.12)] pb-px"
          role="tablist"
          aria-label="Legal policies"
        >
          {rows.map((r) => {
            const active = !creating && selectedId === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-white text-[var(--hb-ink)] shadow-[0_-1px_0_0_#fff,0_1px_0_0_rgba(26,92,58,0.12)]'
                    : 'text-[var(--hb-ink)]/55 hover:text-[var(--hb-ink)]'
                }`}
                onClick={() => loadDoc(r)}
              >
                {r.title}
                {!r.isPublished ? (
                  <span className="ml-1.5 text-xs font-normal text-[var(--hb-ink)]/40">
                    draft
                  </span>
                ) : null}
              </button>
            );
          })}
          {canWrite ? (
            <button
              type="button"
              role="tab"
              aria-selected={creating}
              className={`rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                creating
                  ? 'bg-white text-[var(--hb-ink)] shadow-[0_-1px_0_0_#fff,0_1px_0_0_rgba(26,92,58,0.12)]'
                  : 'text-[var(--hb-green)] hover:text-[var(--hb-ink)]'
              }`}
              onClick={startCreate}
            >
              + New
            </button>
          ) : null}
        </div>

        <section className="hb-surface rounded-t-none p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                {creating ? 'New document' : selected?.title ?? 'Editor'}
              </h2>
              {!canWrite ? (
                <p className="mt-1 text-sm text-[var(--hb-ink)]/50">
                  Read-only — legal.write is required to edit.
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3.5 py-2 text-sm"
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </button>
          </div>

          <form className="mt-4 space-y-4" onSubmit={(e) => void save(e)}>
            <label className="block text-sm">
              <span className="text-[var(--hb-ink)]/55">Title</span>
              <input
                className="hb-input mt-1 w-full"
                value={title}
                disabled={!canWrite}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label className="block text-sm">
              <span className="text-[var(--hb-ink)]/55">Subtitle</span>
              <input
                className="hb-input mt-1 w-full"
                value={subtitle}
                disabled={!canWrite}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-[var(--hb-ink)]/55">Sort order</span>
                <input
                  className="hb-input mt-1 w-full"
                  type="number"
                  min={0}
                  value={sortOrder}
                  disabled={!canWrite}
                  onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                />
              </label>
              <div className="flex flex-wrap items-end gap-4 pb-1 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showInFooter}
                    disabled={!canWrite}
                    onChange={(e) => setShowInFooter(e.target.checked)}
                  />
                  Show in footer
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    disabled={!canWrite}
                    onChange={(e) => setIsPublished(e.target.checked)}
                  />
                  Published
                </label>
              </div>
            </div>

            <label className="block text-sm">
              <span className="text-[var(--hb-ink)]/55">Body (Markdown)</span>
              <textarea
                className="hb-input mt-1 min-h-[22rem] w-full font-mono text-xs leading-relaxed"
                value={bodyMarkdown}
                disabled={!canWrite}
                onChange={(e) => setBodyMarkdown(e.target.value)}
                required
              />
            </label>

            {canWrite ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="hb-btn hb-btn-primary"
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Save'}
                </button>
                {!creating && selectedId ? (
                  <button
                    type="button"
                    className="hb-btn hb-btn-ghost"
                    disabled={busy}
                    onClick={() => void unpublishOrDelete()}
                  >
                    {slugLocked ? 'Unpublish' : 'Delete'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </form>
        </section>
      </div>

      <Modal
        open={previewOpen}
        title={title.trim() || 'Preview'}
        onClose={() => setPreviewOpen(false)}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              className="hb-btn hb-btn-ghost px-3.5 py-2 text-sm"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </button>
          </div>
        }
      >
        {subtitle.trim() ? (
          <p className="mb-4 text-sm text-[var(--hb-ink)]/60">
            {subtitle.trim()}
          </p>
        ) : null}
        <div className="max-h-[min(60vh,28rem)] overflow-y-auto">
          {renderMarkdownToReact(bodyMarkdown || '_Nothing to preview yet._')}
        </div>
      </Modal>
    </>
  );
}
