import {
  popularCategories,
  CategoryIconBadge,
  useCatalogueStore,
  type CategoryNode,
} from '@halal-basket/web';

export function PopularCategories() {
  const setCategory = useCatalogueStore((s) => s.setCategory);
  const active = useCatalogueStore((s) => s.category);
  const cats = popularCategories();

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
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5 xl:gap-4">
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
                  className={`flex h-full w-full flex-col items-start gap-[var(--hb-icon-gap-lg)] rounded-[var(--hb-radius-lg)] border px-4 py-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--hb-shadow)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)] ${
                    selected
                      ? 'border-[var(--hb-green)] bg-[var(--hb-mist)] text-[var(--hb-green)]'
                      : 'border-[rgba(26,92,58,0.12)] bg-white text-[var(--hb-ink)]'
                  }`}
                  aria-pressed={selected}
                >
                  <CategoryIconBadge id={c.id} size="lg" />
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
