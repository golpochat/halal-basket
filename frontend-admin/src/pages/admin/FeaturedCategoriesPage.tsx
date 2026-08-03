import { useEffect, useState } from 'react';
import {
  ICON_SIZES,
  IconButton,
  UtilityIcons,
} from '@halal-basket/web';
import { RequireAuth, RequirePermission } from '../../auth/guards';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../lib/api';
import { Flash } from './Flash';
import type { FeaturedAdminResponse } from './types';

export function AdminFeaturedCategoriesPage() {
  return (
    <RequireAuth>
      <RequirePermission permissions={['branding.read']}>
        <FeaturedCategoriesInner />
      </RequirePermission>
    </RequireAuth>
  );
}

function FeaturedCategoriesInner() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const isSuper = session!.user.role === 'super_admin';
  const canWrite =
    isSuper || (session!.permissions ?? []).includes('branding.write');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [featured, setFeatured] = useState<FeaturedAdminResponse | null>(null);

  useEffect(() => {
    api<FeaturedAdminResponse>('/admin/featured-categories', { token })
      .then(setFeatured)
      .catch((e: Error) => setError(e.message));
  }, [token]);

  async function saveFeatured(
    items: Array<{ categoryId: string; sortOrder: number; isActive: boolean }>,
  ) {
    if (!canWrite) return;
    setError('');
    setMsg('');
    try {
      const res = await api<FeaturedAdminResponse>('/admin/featured-categories', {
        method: 'PUT',
        token,
        body: JSON.stringify({ items }),
      });
      setFeatured(res);
      setMsg('Popular categories saved');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save featured categories',
      );
    }
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Featured categories
      </h1>
      <div className="mt-6">
        <Flash error={error} msg={msg} />

        {featured && (
          <section className="hb-surface mb-6 p-5 shadow-sm">
            <h2 className="font-semibold">Popular categories</h2>
            <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
              Shown on the customer homepage and sidebar. Keep between{' '}
              {featured.minVisible} and {featured.maxVisible} active (soft
              limits). Order is top → bottom / left → right.
            </p>
            {!canWrite ? (
              <p className="mt-2 text-sm text-[var(--hb-ink)]/50">
                Read-only — branding.write is required to edit.
              </p>
            ) : null}
            <ul className="mt-4 space-y-2">
              {featured.items.map((item, index) => (
                <li
                  key={item.categoryId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{item.name}</strong>
                    <span className="text-[var(--hb-ink)]/45">
                      {' '}
                      · {item.categoryId}
                      {item.isActive ? ' · active' : ' · off'}
                    </span>
                  </span>
                  {canWrite ? (
                    <span className="flex flex-wrap items-center gap-1">
                      <IconButton
                        label={`Move ${item.name} up`}
                        tooltip="Move up"
                        disabled={index === 0}
                        onClick={async () => {
                          const next = featured.items.map((row) => ({ ...row }));
                          const tmp = next[index - 1];
                          next[index - 1] = next[index];
                          next[index] = tmp;
                          await saveFeatured(
                            next.map((row, i) => ({
                              categoryId: row.categoryId,
                              sortOrder: i,
                              isActive: row.isActive,
                            })),
                          );
                        }}
                      >
                        {UtilityIcons.arrowUp({ size: ICON_SIZES.sm })}
                      </IconButton>
                      <IconButton
                        label={`Move ${item.name} down`}
                        tooltip="Move down"
                        disabled={index === featured.items.length - 1}
                        onClick={async () => {
                          const next = featured.items.map((row) => ({ ...row }));
                          const tmp = next[index + 1];
                          next[index + 1] = next[index];
                          next[index] = tmp;
                          await saveFeatured(
                            next.map((row, i) => ({
                              categoryId: row.categoryId,
                              sortOrder: i,
                              isActive: row.isActive,
                            })),
                          );
                        }}
                      >
                        {UtilityIcons.arrowDown({ size: ICON_SIZES.sm })}
                      </IconButton>
                      <IconButton
                        label={
                          item.isActive
                            ? `Hide ${item.name} from Popular`
                            : `Show ${item.name} in Popular`
                        }
                        tooltip={item.isActive ? 'Hide' : 'Show'}
                        onClick={async () => {
                          setError('');
                          setMsg('');
                          try {
                            const res = await api<FeaturedAdminResponse>(
                              `/admin/featured-categories/${item.categoryId}/active`,
                              {
                                method: 'PATCH',
                                token,
                                body: JSON.stringify({
                                  isActive: !item.isActive,
                                }),
                              },
                            );
                            setFeatured(res);
                            setMsg(
                              item.isActive
                                ? `${item.name} hidden from Popular`
                                : `${item.name} shown in Popular`,
                            );
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : 'Failed to update featured category',
                            );
                          }
                        }}
                      >
                        {item.isActive
                          ? UtilityIcons.eyeOff({ size: ICON_SIZES.sm })
                          : UtilityIcons.eye({ size: ICON_SIZES.sm })}
                      </IconButton>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {canWrite &&
            featured.available.some(
              (a) => !featured.items.some((i) => i.categoryId === a.id),
            ) ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
                  Add category
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {featured.available
                    .filter(
                      (a) => !featured.items.some((i) => i.categoryId === a.id),
                    )
                    .map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="hb-btn hb-btn-ghost px-2 py-1 text-xs"
                        onClick={async () => {
                          await saveFeatured([
                            ...featured.items.map((row, i) => ({
                              categoryId: row.categoryId,
                              sortOrder: i,
                              isActive: row.isActive,
                            })),
                            {
                              categoryId: a.id,
                              sortOrder: featured.items.length,
                              isActive: true,
                            },
                          ]);
                        }}
                      >
                        + {a.name}
                      </button>
                    ))}
                </div>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </>
  );
}
