import {
  Button,
  MenuSelect,
  UtilityIcons,
  useCatalogueStore,
  type SortBy,
} from '@halal-basket/web';
import type { ReactNode } from 'react';
import { useLocale } from '../../locale/LocaleContext';

export function ResultsToolbar({ count }: { count: number }) {
  const { t } = useLocale();
  const viewMode = useCatalogueStore((s) => s.viewMode);
  const setViewMode = useCatalogueStore((s) => s.setViewMode);
  const sortBy = useCatalogueStore((s) => s.sortBy);
  const setSortBy = useCatalogueStore((s) => s.setSortBy);
  const setFiltersOpen = useCatalogueStore((s) => s.setFiltersOpen);

  const sortOptions: { value: SortBy; label: string }[] = [
    { value: 'newest', label: t('catalogue.sortNewest') },
    { value: 'price-asc', label: t('catalogue.sortPriceAsc') },
    { value: 'price-desc', label: t('catalogue.sortPriceDesc') },
    { value: 'name', label: t('catalogue.sortName') },
  ];

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--hb-ink)]/65">
        {t(count === 1 ? 'catalogue.showing_one' : 'catalogue.showing_other', {
          count,
        })}
      </p>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Desktop only — mobile uses the sticky Filters bar */}
        <Button
          variant="tertiary"
          size="sm"
          className="hidden h-10 gap-[var(--hb-icon-gap)] lg:inline-flex"
          onClick={() => setFiltersOpen(true)}
        >
          {UtilityIcons.filters({ size: 18 })}
          {t('catalogue.filters')}
        </Button>

        <div
          className="flex h-10 overflow-hidden rounded-[var(--hb-radius)] border border-[rgba(26,92,58,0.18)] bg-white"
          role="group"
          aria-label={t('catalogue.viewMode')}
        >
          <ViewBtn
            active={viewMode === 'grid'}
            onClick={() => setViewMode('grid')}
            label={t('catalogue.gridView')}
          >
            {UtilityIcons.grid({ size: 16 })}
          </ViewBtn>
          <ViewBtn
            active={viewMode === 'list'}
            onClick={() => setViewMode('list')}
            label={t('catalogue.listView')}
          >
            {UtilityIcons.list({ size: 16 })}
          </ViewBtn>
        </div>

        <MenuSelect
          label={t('catalogue.sortBy')}
          value={sortBy}
          options={sortOptions}
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
