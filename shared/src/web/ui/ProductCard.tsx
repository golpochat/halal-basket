import type { ReactNode } from 'react';
import { Badge, HalalBadge, PartnerBadge } from './Badge';
import { Button } from './Button';
import { ProductImage } from './ProductImage';
import type { StockLevel } from '../types';

export type ProductCardData = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  shopName?: string;
  stock: StockLevel;
  verifiedHalal?: boolean;
  shopPartner?: boolean;
};

function stockLabel(stock: StockLevel) {
  switch (stock) {
    case 'in_stock':
      return { text: 'In stock', tone: 'green' as const };
    case 'low_stock':
      return { text: 'Low stock', tone: 'warning' as const };
    default:
      return { text: 'Out of stock', tone: 'danger' as const };
  }
}

export function ProductCard({
  product,
  qty,
  onAdd,
  onDec,
  formatMoney,
  layout = 'grid',
}: {
  product: ProductCardData;
  qty: number;
  onAdd: () => void;
  onDec: () => void;
  formatMoney: (n: number) => string;
  layout?: 'grid' | 'list';
}) {
  const stock = stockLabel(product.stock);
  const canAdd = product.stock !== 'out_of_stock';

  if (layout === 'list') {
    return (
      <article className="hb-surface flex gap-4 overflow-hidden p-3 shadow-[var(--hb-shadow-sm)] transition hover:shadow-[var(--hb-shadow)] sm:p-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--hb-radius)] sm:h-28 sm:w-28">
          <ProductImage src={product.imageUrl} alt={product.name} size="sm" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{product.name}</h2>
            {product.shopName && (
              <p className="mt-0.5 text-xs text-[var(--hb-ink)]/50">
                {product.shopName}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="font-display text-xl font-semibold">
                {formatMoney(product.price)}
              </p>
              <Badge tone={stock.tone}>{stock.text}</Badge>
              {product.verifiedHalal && <HalalBadge />}
            </div>
          </div>
          <div className="mt-3 sm:mt-0">
            {!canAdd ? null : qty > 0 ? (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={onDec}
                  aria-label={`Decrease ${product.name}`}
                >
                  −
                </Button>
                <span className="min-w-5 text-center text-sm font-semibold">
                  {qty}
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onAdd}
                  aria-label={`Increase ${product.name}`}
                >
                  +
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={onAdd}>
                Add
              </Button>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="hb-surface group flex flex-col overflow-hidden p-0 shadow-[var(--hb-shadow-sm)] transition hover:-translate-y-0.5 hover:shadow-[var(--hb-shadow)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProductImage src={product.imageUrl} alt={product.name} size="md" />
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {product.verifiedHalal && <HalalBadge />}
          {product.shopPartner && <PartnerBadge />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
          {product.name}
        </h2>
        {product.shopName && (
          <p className="text-xs text-[var(--hb-ink)]/50">{product.shopName}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {formatMoney(product.price)}
            </p>
            <p className="mt-1">
              <Badge tone={stock.tone}>{stock.text}</Badge>
            </p>
          </div>
          {!canAdd ? null : qty > 0 ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="tertiary"
                size="sm"
                onClick={onDec}
                aria-label={`Decrease ${product.name}`}
              >
                −
              </Button>
              <span className="min-w-5 text-center text-sm font-semibold">
                {qty}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={onAdd}
                aria-label={`Increase ${product.name}`}
              >
                +
              </Button>
            </div>
          ) : (
            <Button variant="primary" size="sm" onClick={onAdd}>
              Add
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  children,
  layout = 'grid',
}: {
  children: ReactNode;
  layout?: 'grid' | 'list';
}) {
  if (layout === 'list') {
    return <div className="flex flex-col gap-3">{children}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
      {children}
    </div>
  );
}
