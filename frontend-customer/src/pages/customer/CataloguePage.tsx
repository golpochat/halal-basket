import { useEffect, useMemo } from 'react';
import {
  Button,
  EmptyState,
  ErrorState,
  ProductCard,
  ProductCardSkeleton,
  ProductGrid,
  MenuSelect,
  UtilityIcons,
  TrustLocalStockIcon,
  collectMatchNames,
  deriveStockLevel,
  findCategoryNode,
  useCartStore,
  useCatalogueStore,
  useDeliveryCalendarQuery,
  useShopProductsQuery,
  useShopsQuery,
  useToastStore,
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

export function CataloguePage() {
  const { formatMoney } = useLocale();
  const toast = useToastStore((s) => s.toast);

  const search = useCatalogueStore((s) => s.search);
  const browsePath = useCatalogueStore((s) => s.browsePath);
  const pushBrowse = useCatalogueStore((s) => s.pushBrowse);
  const popBrowseTo = useCatalogueStore((s) => s.popBrowseTo);
  const goHome = useCatalogueStore((s) => s.goHome);
  const area = useCatalogueStore((s) => s.area);
  const setArea = useCatalogueStore((s) => s.setArea);
  const shopId = useCatalogueStore((s) => s.shopId);
  const setShopId = useCatalogueStore((s) => s.setShopId);
  const filters = useCatalogueStore((s) => s.filters);
  const setFiltersOpen = useCatalogueStore((s) => s.setFiltersOpen);
  const viewMode = useCatalogueStore((s) => s.viewMode);
  const sortBy = useCatalogueStore((s) => s.sortBy);
  const pushRecent = useCatalogueStore((s) => s.pushRecent);

  const cartShopId = useCartStore((s) => s.shopId);
  const setCartShopId = useCartStore((s) => s.setShopId);
  const lines = useCartStore((s) => s.lines);
  const add = useCartStore((s) => s.add);
  const setQty = useCartStore((s) => s.setQty);

  const shopsQuery = useShopsQuery(api);
  const calendarQuery = useDeliveryCalendarQuery(api);
  const productsQuery = useShopProductsQuery(api, shopId);

  const shops = shopsQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const isHome = browsePath.length === 0 && !search.trim();
  const currentId = browsePath[browsePath.length - 1] ?? null;
  const currentNode = currentId ? findCategoryNode(currentId) : null;
  const childNodes = currentNode?.children ?? [];
  const showSubcategories =
    browsePath.length > 0 && childNodes.length > 0 && !search.trim();
  const showProducts =
    Boolean(search.trim()) ||
    (browsePath.length > 0 && childNodes.length === 0) ||
    isHome;

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

  const breadcrumbs = useMemo(() => {
    return browsePath
      .map((id) => findCategoryNode(id))
      .filter(Boolean)
      .map((n) => ({ id: n!.id, name: n!.name }));
  }, [browsePath]);

  useEffect(() => {
    if (shops[0] && !shopId) {
      setShopId(shops[0].id);
      if (!cartShopId) setCartShopId(shops[0].id);
    }
  }, [shops, shopId, cartShopId, setShopId, setCartShopId]);

  useEffect(() => {
    if (areas[0] && !area) setArea(areas[0]);
  }, [areas, area, setArea]);

  const shopName = shops.find((s) => s.id === shopId)?.name ?? '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchNames =
      !currentNode || isHome ? null : collectMatchNames(currentNode);

    let list = products.filter((p) => {
      if (matchNames && !q) {
        const catName = p.product.category?.name ?? '';
        if (!matchNames.includes(catName)) return false;
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
  }, [products, search, currentNode, isHome, filters, sortBy]);

  const recommended = useMemo(() => {
    if (!isHome) return [];
    const primaryIds = new Set(
      filtered.slice(0, 6).map((p) => p.productId),
    );
    return products
      .filter((p) => p.isInStock && !primaryIds.has(p.productId))
      .slice(0, 4);
  }, [isHome, products, filtered]);

  function onShopChange(id: string) {
    setShopId(id);
    setCartShopId(id);
  }

  function handleAdd(p: (typeof products)[0]) {
    const price = Number(p.discountPrice ?? p.price);
    add({
      productId: p.productId,
      name: p.product.name,
      price,
      shopId,
      shopName,
    });
    pushRecent(p.productId);
    toast(`Added ${p.product.name}`);
  }

  const loading =
    shopsQuery.isLoading || (Boolean(shopId) && productsQuery.isLoading);
  const error =
    shopsQuery.error ?? calendarQuery.error ?? productsQuery.error;

  function retry() {
    void shopsQuery.refetch();
    void calendarQuery.refetch();
    void productsQuery.refetch();
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
          shopName,
          stock: deriveStockLevel(p.isInStock),
          verifiedHalal: true,
          shopPartner: true,
        }}
        qty={qty}
        formatMoney={formatMoney}
        onAdd={() => handleAdd(p)}
        onDec={() => setQty(p.productId, qty - 1)}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader areas={areas} showNavSearch={!isHome} />

      <div className="flex min-h-0 w-full flex-1">
        <CategorySidebar />

        <div className="min-w-0 flex-1">
          {isHome && (
            <>
              <CatalogueHero areaSummary={areaSummary} />
              <PopularCategories />
            </>
          )}

          <div className="sticky top-14 z-30 flex gap-2 border-b border-[rgba(26,92,58,0.08)] bg-[rgba(247,250,246,0.97)] px-4 py-2 backdrop-blur-md sm:top-16 lg:hidden">
            <Button
              variant="tertiary"
              size="sm"
              className="w-full gap-[var(--hb-icon-gap)]"
              onClick={() => setFiltersOpen(true)}
            >
              {UtilityIcons.filters({ size: 18 })}
              Filters
            </Button>
          </div>

          <main
            id="catalogue-grid"
            className="scroll-mt-24 px-4 py-6 sm:px-6 sm:py-8"
          >
            {!isHome && (
              <nav
                className="mb-4 flex flex-wrap items-center gap-1 text-sm text-[var(--hb-ink)]/55"
                aria-label="Breadcrumb"
              >
                <button
                  type="button"
                  className="font-medium text-[var(--hb-green)] hover:underline"
                  onClick={() => goHome()}
                >
                  Home
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
                  {currentNode?.name}
                </h2>
                <SubcategoryGrid
                  nodes={childNodes}
                  onSelect={(id) => pushBrowse(id)}
                />
              </section>
            )}

            {showProducts && (
              <>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="font-display text-xl font-semibold sm:text-2xl">
                      {isHome
                        ? 'All products'
                        : search.trim()
                          ? 'Search results'
                          : (currentNode?.name ?? 'Products')}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--hb-ink)]/55">
                      {shopName || 'Choose a pickup shop'}
                      {area ? ` · ${area}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {shops.length > 0 && (
                      <MenuSelect
                        label="Shop / pickup location"
                        value={shopId}
                        options={shops.map((s) => ({
                          value: s.id,
                          label: s.name,
                        }))}
                        onChange={onShopChange}
                        triggerClassName="min-w-[12rem] max-w-[16rem] sm:max-w-[20rem]"
                      />
                    )}
                    <Button
                      variant="tertiary"
                      size="sm"
                      className="hidden h-10 gap-[var(--hb-icon-gap)] lg:inline-flex"
                      onClick={() => setFiltersOpen(true)}
                    >
                      {UtilityIcons.filters({ size: 18 })}
                      Filters
                    </Button>
                  </div>
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
                          : 'Unable to load products. Try again.'
                      }
                      onRetry={retry}
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
                    title="No products found."
                    description="Try another category, shop, filter, or search term."
                  />
                )}

                {!loading && filtered.length > 0 && (
                  <ProductGrid layout={viewMode}>
                    {filtered.map((p) => renderCard(p))}
                  </ProductGrid>
                )}

                {!loading && recommended.length > 0 && (
                  <section
                    className="mt-12 border-t border-[rgba(26,92,58,0.08)] pt-10"
                    aria-labelledby="recommended-heading"
                  >
                    <div className="mb-1 flex items-center gap-[var(--hb-icon-gap)]">
                      <span className="hb-icon-badge hb-icon-badge--sm" aria-hidden>
                        <TrustLocalStockIcon size={18} />
                      </span>
                      <h2
                        id="recommended-heading"
                        className="font-display text-xl font-semibold sm:text-2xl"
                      >
                        Recommended for you
                      </h2>
                    </div>
                    <p className="text-sm text-[var(--hb-ink)]/55">
                      In-stock picks that are not already in the grid above
                    </p>
                    <div className="mt-5">
                      <ProductGrid layout={viewMode}>
                        {recommended.map((p) => renderCard(p, 'rec-'))}
                      </ProductGrid>
                    </div>
                  </section>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      <AppFooter />
      <CartDrawer />
      <FiltersPanel />
    </div>
  );
}
