import {
  MenuSelect,
  UtilityIcons,
  useCatalogueStore,
  type SortBy,
} from '@halal-basket/web';
import type { ReactNode } from 'react';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'name', label: 'Name A–Z' },
];

export function ResultsToolbar({ count }: { count: number }) {
  const viewMode = useCatalogueStore((s) => s.viewMode);
  const setViewMode = useCatalogueStore((s) => s.setViewMode);
  const sortBy = useCatalogueStore((s) => s.sortBy);
  const setSortBy = useCatalogueStore((s) => s.setSortBy);

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--hb-ink)]/65">
        Showing <span className="font-semibold text-[var(--hb-ink)]">{count}</span>{' '}
        {count === 1 ? 'result' : 'results'}
      </p>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div
          className="flex h-10 overflow-hidden rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.18)] bg-white"
          role="group"
          aria-label="View mode"
        >
          <ViewBtn
            active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            label="Grid view"
          >
            {UtilityIcons.grid({ size: 16 })}
          </ViewBtn>
          <ViewBtn
            active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            label="List view"
          >
            {UtilityIcons.list({ size: 16 })}
          </ViewBtn>
        </div>

        <MenuSelect
          label="Sort by"
          value={sortBy}
          options={SORT_OPTIONS}
          onChange={(v) => setSortBy(v as SortBy)}
          triggerClassName="min-w-[10.5rem] sm:min-w-[12rem]"
        />
      </div>
    </div>
  );
}

function ViewBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex h-10 w-10 items-center justify-center transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)] ${
        active
          ? 'bg-[var(--hb-green)] text-white'
          : 'text-[var(--hb-ink)]/60 hover:bg-[var(--hb-mist)]'
      }`}
    >
      {children}
    </button>
  );
}
