import {
  Button,
  Modal,
  TextInput,
  MenuSelect,
  useCatalogueStore,
} from '@halal-basket/web';
import { useLocale } from '../../locale/LocaleContext';

export function FiltersPanel() {
  const { t } = useLocale();
  const open = useCatalogueStore((s) => s.filtersOpen);
  const setFiltersOpen = useCatalogueStore((s) => s.setFiltersOpen);
  const filters = useCatalogueStore((s) => s.filters);
  const setFilters = useCatalogueStore((s) => s.setFilters);
  const resetFilters = useCatalogueStore((s) => s.resetFilters);

  const deliveryOptions = [
    { value: 'any', label: t('catalogue.deliveryAny') },
    { value: 'scheduled', label: t('catalogue.deliveryScheduled') },
    { value: 'pickup', label: t('catalogue.deliveryPickup') },
  ];

  return (
    <Modal
      open={open}
      title={t('catalogue.filters')}
      onClose={() => setFiltersOpen(false)}
      footer={
        <div className="flex gap-2">
          <Button
            variant="tertiary"
            className="h-10 flex-1"
            onClick={() => {
              resetFilters();
            }}
          >
            {t('catalogue.reset')}
          </Button>
          <Button
            variant="primary"
            className="h-10 flex-1"
            onClick={() => setFiltersOpen(false)}
          >
            {t('catalogue.apply')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label={t('catalogue.minPrice')}
            type="number"
            min={0}
            step="0.01"
            value={filters.priceMin ?? ''}
            onChange={(e) =>
              setFilters({
                priceMin: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
          <TextInput
            label={t('catalogue.maxPrice')}
            type="number"
            min={0}
            step="0.01"
            value={filters.priceMax ?? ''}
            onChange={(e) =>
              setFilters({
                priceMax: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) => setFilters({ inStockOnly: e.target.checked })}
            className="h-4 w-4 accent-[var(--hb-green)]"
          />
          {t('catalogue.inStockOnly')}
        </label>
        <MenuSelect
          label={t('catalogue.deliveryType')}
          showLabel
          value={filters.deliveryType}
          options={deliveryOptions}
          onChange={(v) =>
            setFilters({
              deliveryType: v as typeof filters.deliveryType,
            })
          }
          fullWidth
        />
        <p className="text-xs text-[var(--hb-ink)]/50">
          {t('catalogue.filtersHint')}
        </p>
      </div>
    </Modal>
  );
}
