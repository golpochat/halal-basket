import {
  resolveFeaturedCategories,
  CategoryIconBadge,
  useCatalogueStore,
  useFeaturedCategoriesQuery,
  type CategoryNode,
} from '@halal-basket/web';
import { api } from '../../lib/api';

export function PopularCategories() {
  const setCategory = useCatalogueStore((s) => s.setCategory);
  const active = useCatalogueStore((s) => s.category);
  const featuredQuery = useFeaturedCategoriesQuery(api);
  const cats = resolveFeaturedCategories(featuredQuery.data?.categories);

  if (cats.length === 0) return null;

  const count = cats.length;
  const gridClass =
    count <= 4
      ? 'mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:gap-4'
      : count === 5
        ? 'mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4'
        : 'mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 xl:gap-4';

  return (
    <section
      className="border-b border-[rgba(26,92,58,0.08)] bg-white/35"
      aria-labelledby="popular-categories-heading"
    >
      <div className="px-4 py-8 sm:px-6 sm:py-10">
        <h2
          id="popular-categories-heading"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          Popular categories
        </h2>
        <p className="mt-1 text-sm text-[var(--hb-ink)]/55 sm:text-base">
          Jump straight to what you need
        </p>
        <ul className={gridClass}>
          {cats.map((c: CategoryNode) => {
            const selected = active === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCategory(c.id);
                    document
                      .getElementById('catalogue-grid')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`hb-popular-card focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)] ${
                    selected ? 'is-selected' : 'text-[var(--hb-ink)]'
                  }`}
                  aria-pressed={selected}
                  aria-label={`Browse ${c.name}`}
                >
                  <CategoryIconBadge id={c.id} size="xl" />
                  <span className="text-sm font-semibold leading-snug sm:text-base">
                    {c.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
