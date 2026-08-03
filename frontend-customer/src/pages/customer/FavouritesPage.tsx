import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EmptyState,
  ProductCard,
  ProductGrid,
  deriveStockLevel,
  toastError,
  toastSuccess,
  useCartStore,
  useCatalogueStore,
  usePlatformCatalogueQuery,
  useToastStore,
} from '@halal-basket/web';
import { useAuth } from '../../auth/AuthContext';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';
import { useFavourites } from '../../hooks/useFavourites';

type FavouriteRow = {
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    imageUrl: string | null;
    isActive: boolean;
  };
};

type CatalogueRow = {
  productId: string;
  price: string | number;
  discountPrice?: string | number | null;
  isInStock: boolean;
};

export function CustomerFavouritesPage() {
  const { session } = useAuth();
  const token = session!.accessToken;
  const { formatMoney } = useLocale();
  const toast = useToastStore((s) => s.toast);
  const area = useCatalogueStore((s) => s.area);
  const lines = useCartStore((s) => s.lines);
  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);
  const fav = useFavourites();

  const [rows, setRows] = useState<FavouriteRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const catalogueQuery = usePlatformCatalogueQuery(api, area || undefined, true);
  const catalogueById = useMemo(() => {
    const map = new Map<string, CatalogueRow>();
    for (const p of (catalogueQuery.data ?? []) as CatalogueRow[]) {
      map.set(p.productId, p);
    }
    return map;
  }, [catalogueQuery.data]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<{ items: FavouriteRow[] }>('/customers/me/favourites', { token })
      .then((res) => {
        if (!cancelled) {
          setRows(res.items);
          setError('');
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, fav.ids]);

  return (
    <>
      <h1 className="font-display text-3xl font-semibold tracking-tight">
        Favourites
      </h1>
      <p className="mt-2 text-sm text-[var(--hb-ink)]/60">
        Saved products for quick add. Prices and stock follow your selected
        delivery area{area ? ` (${area})` : ''}.
      </p>

      <div className="mt-6">
        {error ? (
          <p className="text-sm text-[var(--hb-danger,#b42318)]">{error}</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-[var(--hb-ink)]/55">Loading…</p>
        ) : null}

        {!loading && rows.length === 0 ? (
          <EmptyState
            title="No favourites yet"
            description="Tap the heart on a product in the shop to save it here."
          />
        ) : null}

        {!loading && rows.length > 0 ? (
          <ProductGrid>
            {rows.map((row) => {
              const live = catalogueById.get(row.productId);
              const price = live
                ? Number(live.discountPrice ?? live.price)
                : 0;
              const stock = live
                ? deriveStockLevel(live.isInStock)
                : 'out_of_stock';
              const qty =
                lines.find((l) => l.productId === row.productId)?.quantity ??
                0;
              return (
                <ProductCard
                  key={row.productId}
                  product={{
                    productId: row.productId,
                    name: row.product.name,
                    price: live ? price : 0,
                    imageUrl: row.product.imageUrl,
                    stock,
                    verifiedHalal: true,
                    shopPartner: true,
                  }}
                  qty={qty}
                  formatMoney={formatMoney}
                  favourited
                  onToggleFavourite={() => {
                    void fav.toggle(row.productId).then(
                      () => toastSuccess('Removed from favourites'),
                      (err: Error) => toastError(err.message),
                    );
                  }}
                  onAdd={() => {
                    if (!live) {
                      toastError(
                        area
                          ? 'Not available in your area right now'
                          : 'Select a delivery area on the shop to see price',
                      );
                      return;
                    }
                    add({
                      productId: row.productId,
                      name: row.product.name,
                      price,
                      imageUrl: row.product.imageUrl,
                    });
                    toast(`Added ${row.product.name}`);
                  }}
                  onDec={() => {
                    if (qty <= 1) setQty(row.productId, 0);
                    else setQty(row.productId, qty - 1);
                  }}
                />
              );
            })}
          </ProductGrid>
        ) : null}

        <p className="mt-6 text-sm">
          <Link to="/" className="text-[var(--hb-green)] hover:underline">
            Continue shopping →
          </Link>
        </p>
      </div>
    </>
  );
}
