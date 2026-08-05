import { useEffect, useMemo } from 'react';
import {
  Button,
  EmptyState,
  ErrorState,
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  UtilityIcons,
  categoryDisplayName,
  deriveStockLevel,
  findCategoryNode,
  productMatchesBrowseNode,
  useCartStore,
  useCatalogueStore,
  useDeliveryCalendarQuery,
  usePlatformCatalogueQuery,
  useToastStore,
  toastError,
  toastSuccess,
  localizeProductName,
} from '@halal-basket/web';
import { AppHeader } from '../../components/layout/AppHeader';
import { AppFooter } from '../../components/layout/AppFooter';
import { CategorySidebar } from '../../components/layout/CategorySidebar';
import { CatalogueHero } from '../../components/catalogue/CatalogueHero';
import { PopularCategories } from '../../components/catalogue/PopularCategories';
import { SubcategoryGrid } from '../../components/catalogue/SubcategoryGrid';
import { ResultsToolbar } from '../../components/catalogue/ResultsToolbar';
import { CartDrawer } from '../../components/catalogue/CartDrawer';
import { FiltersPanel } from '../../components/catalogue/FiltersPanel';
import { useLocale } from '../../locale/LocaleContext';
import { api } from '../../lib/api';
import { useFavourites } from '../../hooks/useFavourites';
import { useWhatsappAssistHandoff } from '../../hooks/useWhatsappAssistHandoff';

export function CataloguePage() {
  const { formatMoney, formatNumber, t, languageCode } = useLocale();
  const toast = useToastStore((s) => s.toast);
  const fav = useFavourites();
  useWhatsappAssistHandoff();

  const search = useCatalogueStore((s) => s.search);
  const browsePath = useCatalogueStore((s) => s.browsePath);
  const pushBrowse = useCatalogueStore((s) => s.pushBrowse);
  const popBrowseTo = useCatalogueStore((s) => s.popBrowseTo);
  const goHome = useCatalogueStore((s) => s.goHome);
  const area = useCatalogueStore((s) => s.area);
  const setArea = useCatalogueStore((s) => s.setArea);
  const filters = useCatalogueStore((s) => s.filters);
  const setFiltersOpen = useCatalogueStore((s) => s.setFiltersOpen);
  const viewMode = useCatalogueStore((s) => s.viewMode);
  const sortBy = useCatalogueStore((s) => s.sortBy);
  const pushRecent = useCatalogueStore((s) => s.pushRecent);

  const lines = useCartStore((s) => s.lines);
  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);

  const isHome = browsePath.length === 0 && !search.trim();
  const currentId = browsePath[browsePath.length - 1] ?? null;
  const currentNode = currentId ? findCategoryNode(currentId) : null;
  const childNodes = currentNode?.children ?? [];
  const showSubcategories =
    browsePath.length > 0 && childNodes.length > 0 && !search.trim();
  const needsProducts =
    Boolean(search.trim()) ||
    (browsePath.length > 0 && childNodes.length === 0);
  const showProducts = needsProducts;

  const calendarQuery = useDeliveryCalendarQuery(api);
  const productsQuery = usePlatformCatalogueQuery(
    api,
    area || undefined,
    needsProducts,
  );

  const products = productsQuery.data ?? [];

  const areas = useMemo(() => {
    const rows = calendarQuery.data ?? [];
    return Array.from(new Set(rows.map((r) => r.areaName))).sort();
  }, [calendarQuery.data]);

  const areaSummary = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const row of calendarQuery.data ?? []) {
      const days = map.get(row.areaName) ?? [];
      days.push(row.deliveryDay);
      map.set(row.areaName, days);
    }
    return Array.from(map.entries()).map(([name, days]) => ({
      name,
      days: days.join(', '),
    }));
  }, [calendarQuery.data]);

  const selectedAreaDays = useMemo(() => {
    if (!area) return null;
    const needle = area.trim().toLowerCase();
    const match = areaSummary.find(
      (a) => a.name.trim().toLowerCase() === needle,
    );
    return match?.days ?? null;
  }, [area, areaSummary]);

  const breadcrumbs = useMemo(() => {
    return browsePath
      .map((id) => findCategoryNode(id))
      .filter(Boolean)
      .map((n) => ({
        id: n!.id,
        name: categoryDisplayName(n!, languageCode),
      }));
  }, [browsePath, languageCode]);

  useEffect(() => {
    if (areas[0] && !area) setArea(areas[0]);
  }, [areas, area, setArea]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = products.filter((p) => {
      if (currentId && !q) {
        if (
          !productMatchesBrowseNode(
            p.product.name,
            p.product.category?.name,
            currentId,
          )
        ) {
          return false;
        }
      }
      const price = Number(p.discountPrice ?? p.price);
      if (filters.priceMin != null && price < filters.priceMin) return false;
      if (filters.priceMax != null && price > filters.priceMax) return false;
      if (filters.inStockOnly && !p.isInStock) return false;
      if (!q) return true;
      return (
        p.product.name.toLowerCase().includes(q) ||
        (p.product.description ?? '').toLowerCase().includes(q) ||
        (p.product.category?.name ?? '').toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      const pa = Number(a.discountPrice ?? a.price);
      const pb = Number(b.discountPrice ?? b.price);
      switch (sortBy) {
        case 'price-asc':
          return pa - pb;
        case 'price-desc':
          return pb - pa;
        case 'name':
          return a.product.name.localeCompare(b.product.name);
        default:
          return 0;
      }
    });

    return list;
  }, [products, search, currentId, filters, sortBy]);

  function handleAdd(p: (typeof products)[0]) {
    const price = Number(p.discountPrice ?? p.price);
    add({
      productId: p.productId,
      name: p.product.name,
      price,
      imageUrl: p.product.imageUrl,
    });
    pushRecent(p.productId);
    toast(
      t('favourites.added', {
        name: localizeProductName(p.product.name, languageCode),
      }),
    );
  }

  const productLabels = {
    add: t('product.add'),
    inStock: t('product.inStock'),
    lowStock: t('product.lowStock'),
    outOfStock: t('product.outOfStock'),
    saveFavourite: t('product.saveFavourite'),
    removeFavourite: t('product.removeFavourite'),
    decreaseAria: t('product.decreaseAria'),
    increaseAria: t('product.increaseAria'),
  };

  const loading =
    calendarQuery.isLoading ||
    (needsProducts && productsQuery.isLoading);
  const error = needsProducts
    ? (calendarQuery.error ?? productsQuery.error)
    : calendarQuery.error;

  function retry() {
    void calendarQuery.refetch();
    if (needsProducts) void productsQuery.refetch();
  }

  function renderCard(p: (typeof products)[0], keyPrefix = '') {
    const price = Number(p.discountPrice ?? p.price);
    const qty =
      lines.find((l) => l.productId === p.productId)?.quantity ?? 0;
    return (
      <ProductCard
        key={`${keyPrefix}${p.id}`}
        layout={viewMode}
        product={{
          productId: p.productId,
          name: p.product.name,
          price,
          imageUrl: p.product.imageUrl,
          stock: deriveStockLevel(p.isInStock),
        }}
        displayName={localizeProductName(p.product.name, languageCode)}
        qty={qty}
        formatMoney={formatMoney}
        formatQty={formatNumber}
        labels={productLabels}
        onAdd={() => handleAdd(p)}
        onDec={() => setQty(p.productId, qty - 1)}
        favourited={fav.enabled ? fav.isFavourite(p.productId) : undefined}
        onToggleFavourite={
          fav.enabled
            ? () => {
                const was = fav.isFavourite(p.productId);
                void fav.toggle(p.productId).then(
                  () =>
                    toastSuccess(
                      was
                        ? t('favourites.removed')
                        : t('favourites.saved'),
                    ),
                  (err: Error) => toastError(err.message),
                );
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader areas={areas} showNavSearch={!isHome} />

      <div className="flex min-h-0 w-full flex-1">
        <CategorySidebar />

        <div className="hb-catalogue-main">
          {isHome && (
            <>
              <CatalogueHero selectedAreaDays={selectedAreaDays} />
              <PopularCategories />
            </>
          )}

          {showProducts && (
            <div className="sticky top-16 z-30 flex gap-2 border-b border-[rgba(26,92,58,0.08)] bg-[rgba(247,250,246,0.97)] px-4 py-2 backdrop-blur-md sm:top-20 lg:hidden">
              <Button
                variant="tertiary"
                size="sm"
                className="w-full gap-[var(--hb-icon-gap)]"
                onClick={() => setFiltersOpen(true)}
              >
                {UtilityIcons.filters({ size: 18 })}
                {t('catalogue.filters')}
              </Button>
            </div>
          )}

          {(!isHome || showSubcategories || showProducts) && (
          <main
            id="catalogue-grid"
            className="scroll-mt-24 px-4 py-6 sm:px-6 sm:py-8"
          >
            {!isHome && (
              <nav
                className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[var(--hb-ink)]/55"
                aria-label={t('catalogue.breadcrumb')}
              >
                <button
                  type="button"
                  className="font-medium text-[var(--hb-green)] hover:underline"
                  onClick={() => goHome()}
                >
                  {t('catalogue.home')}
                </button>
                {breadcrumbs.map((b, i) => (
                  <span key={b.id} className="inline-flex items-center gap-1">
                    <span aria-hidden>/</span>
                    <button
                      type="button"
                      className={
                        i === breadcrumbs.length - 1
                          ? 'font-semibold text-[var(--hb-ink)]'
                          : 'font-medium text-[var(--hb-green)] hover:underline'
                      }
                      onClick={() => popBrowseTo(i)}
                    >
                      {b.name}
                    </button>
                  </span>
                ))}
              </nav>
            )}

            {showSubcategories && (
              <section>
                <h2 className="mb-4 font-display text-xl font-semibold sm:text-2xl">
                  {currentNode
                    ? categoryDisplayName(currentNode, languageCode)
                    : null}
                </h2>
                <SubcategoryGrid
                  nodes={childNodes}
                  onSelect={(id) => pushBrowse(id)}
                />
              </section>
            )}

            {showProducts && (
              <>
                <div className="mb-5">
                  <h2 className="font-display text-xl font-semibold sm:text-2xl">
                    {search.trim()
                      ? t('catalogue.searchResults')
                      : currentNode
                        ? categoryDisplayName(currentNode, languageCode)
                        : t('catalogue.products')}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
                    Halal Basket
                    {area ? ` · ${area}` : ''}
                  </p>
                </div>

                {!loading && !error && (
                  <ResultsToolbar count={filtered.length} />
                )}

                {error && (
                  <div className="mb-6">
                    <ErrorState
                      message={
                        error instanceof Error
                          ? error.message
                          : t('catalogue.loadError')
                      }
                      onRetry={retry}
                      retryLabel={t('catalogue.tryAgain')}
                    />
                  </div>
                )}

                {loading && !error && (
                  <ProductGrid layout={viewMode}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <ProductCardSkeleton key={i} />
                    ))}
                  </ProductGrid>
                )}

                {!loading && !error && filtered.length === 0 && (
                  <EmptyState
                    title={t('catalogue.emptyTitle')}
                    description={t('catalogue.emptyDesc')}
                  />
                )}

                {!loading && filtered.length > 0 && (
                  <ProductGrid layout={viewMode}>
                    {filtered.map((p) => renderCard(p))}
                  </ProductGrid>
                )}
              </>
            )}
          </main>
          )}
        </div>
      </div>

      <AppFooter />
      <CartDrawer />
      <FiltersPanel />
    </div>
  );
}
