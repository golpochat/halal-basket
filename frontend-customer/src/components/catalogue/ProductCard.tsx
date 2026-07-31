import { Badge } from '../ui/Badge';
import { useLocale } from '../../locale/LocaleContext';

export type ProductCardData = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  shopName?: string;
  isInStock: boolean;
  categoryName?: string | null;
  verifiedHalal?: boolean;
};

export function ProductCard({
  product,
  qty,
  onAdd,
  onDec,
}: {
  product: ProductCardData;
  qty: number;
  onAdd: () => void;
  onDec: () => void;
}) {
  const { formatMoney } = useLocale();

  return (
    <article className="hb-surface group flex flex-col overflow-hidden p-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--hb-mist)]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[var(--hb-green)]/35"
              aria-hidden
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <path
                d="M3 16l5-4 4 3 4-5 5 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {product.verifiedHalal && (
          <div className="absolute left-2 top-2">
            <Badge tone="gold">Halal</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">
          {product.name}
        </h2>
        {product.shopName && (
          <p className="text-xs text-[var(--hb-ink)]/50">{product.shopName}</p>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <p className="font-display text-lg font-semibold sm:text-xl">
              {formatMoney(product.price)}
            </p>
            <p className="text-xs">
              {product.isInStock ? (
                <span className="text-[var(--hb-leaf)]">In stock</span>
              ) : (
                <span className="text-red-700">Out of stock</span>
              )}
            </p>
          </div>
          {!product.isInStock ? null : qty > 0 ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="hb-btn hb-btn-ghost px-2.5 py-1.5 text-sm"
                onClick={onDec}
                aria-label={`Decrease ${product.name}`}
              >
                −
              </button>
              <span className="min-w-5 text-center text-sm font-semibold">
                {qty}
              </span>
              <button
                type="button"
                className="hb-btn hb-btn-primary px-2.5 py-1.5 text-sm"
                onClick={onAdd}
                aria-label={`Increase ${product.name}`}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="hb-btn hb-btn-primary px-3 py-1.5 text-sm"
              onClick={onAdd}
            >
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
