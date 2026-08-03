import type { ReactNode } from 'react';
import { HalalBadge, PartnerBadge } from './Badge';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { ProductImage } from './ProductImage';
import { ICON_SIZES, StockDotIcon, UtilityIcons } from '../../../icons';
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
      return 'In stock';
    case 'low_stock':
      return 'Low stock';
    default:
      return 'Out of stock';
  }
}

function StockStatus({ stock }: { stock: StockLevel }) {
  const label = stockLabel(stock);
  const color =
    stock === 'in_stock'
      ? 'text-[var(--hb-icon-brand-soft)]'
      : stock === 'low_stock'
        ? 'text-[var(--hb-icon-brand-accent)]'
        : 'text-[var(--hb-icon-brand-muted)]';
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold ${color}`}
    >
      <StockDotIcon stock={stock} size={8} title={label} />
      {label}
    </span>
  );
}

function FavouriteControl({
  favourited,
  onToggleFavourite,
}: {
  favourited: boolean;
  onToggleFavourite: () => void;
}) {
  return (
    <IconButton
      label={favourited ? 'Remove from favourites' : 'Save to favourites'}
      className="hb-product-card__fav"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleFavourite();
      }}
    >
      {favourited
        ? UtilityIcons.heartFilled({ size: ICON_SIZES.sm })
        : UtilityIcons.heart({ size: ICON_SIZES.sm })}
    </IconButton>
  );
}

export function ProductCard({
  product,
  qty,
  onAdd,
  onDec,
  formatMoney,
  layout = 'grid',
  favourited,
  onToggleFavourite,
}: {
  product: ProductCardData;
  qty: number;
  onAdd: () => void;
  onDec: () => void;
  formatMoney: (n: number) => string;
  layout?: 'grid' | 'list';
  favourited?: boolean;
  onToggleFavourite?: () => void;
}) {
  const outOfStock = product.stock === 'out_of_stock';
  const canAdd = !outOfStock;
  const showFav = typeof onToggleFavourite === 'function';

  const oosLabel = outOfStock ? (
    <div className="hb-product-card__oos-label" aria-hidden>
      <span>Out of stock</span>
    </div>
  ) : null;

  if (layout === 'list') {
    return (
      <article
        className={`hb-surface flex gap-4 overflow-hidden p-3 shadow-[var(--hb-shadow-sm)] transition sm:p-4 ${
          outOfStock
            ? 'hb-product-card--oos'
            : 'hover:shadow-[var(--hb-shadow)]'
        }`}
        aria-disabled={outOfStock || undefined}
      >
        <div className="hb-product-card__media relative h-24 w-24 shrink-0 overflow-hidden rounded-[var(--hb-radius)] sm:h-28 sm:w-28">
          <ProductImage src={product.imageUrl} alt={product.name} size="sm" />
          {oosLabel}
          {showFav ? (
            <div className="hb-product-card__fav-wrap">
              <FavouriteControl
                favourited={Boolean(favourited)}
                onToggleFavourite={onToggleFavourite!}
              />
            </div>
          ) : null}
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
              <StockStatus stock={product.stock} />
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
    <article
      className={`hb-surface hb-product-lift group flex flex-col overflow-hidden p-0 shadow-[var(--hb-shadow-sm)] ${
        outOfStock ? 'hb-product-card--oos' : ''
      }`}
      aria-disabled={outOfStock || undefined}
    >
      <div className="hb-product-card__media relative aspect-[4/3] overflow-hidden">
        <ProductImage src={product.imageUrl} alt={product.name} size="md" />
        {oosLabel}
        <div className="hb-product-card__badges">
          {product.verifiedHalal && <HalalBadge />}
          {product.shopPartner && <PartnerBadge />}
        </div>
        {showFav ? (
          <div className="hb-product-card__fav-wrap">
            <FavouriteControl
              favourited={Boolean(favourited)}
              onToggleFavourite={onToggleFavourite!}
            />
          </div>
        ) : null}
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
              <StockStatus stock={product.stock} />
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
