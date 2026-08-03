import {
  Button,
  Modal,
  TextInput,
  MenuSelect,
  useCatalogueStore,
} from '@halal-basket/web';

const DELIVERY_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'scheduled', label: 'Scheduled delivery' },
  { value: 'pickup', label: 'Pickup' },
] as const;

export function FiltersPanel() {
  const open = useCatalogueStore((s) => s.filtersOpen);
  const setFiltersOpen = useCatalogueStore((s) => s.setFiltersOpen);
  const filters = useCatalogueStore((s) => s.filters);
  const setFilters = useCatalogueStore((s) => s.setFilters);
  const resetFilters = useCatalogueStore((s) => s.resetFilters);

  return (
    <Modal
      open={open}
      title="Filters"
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
            Reset
          </Button>
          <Button
            variant="primary"
            className="h-10 flex-1"
            onClick={() => setFiltersOpen(false)}
          >
            Apply
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Min price"
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
            label="Max price"
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
          In stock only
        </label>
        <MenuSelect
          label="Delivery type"
          showLabel
          value={filters.deliveryType}
          options={[...DELIVERY_OPTIONS]}
          onChange={(v) =>
            setFilters({
              deliveryType: v as typeof filters.deliveryType,
            })
          }
          fullWidth
        />
        <p className="text-xs text-[var(--hb-ink)]/50">
          Preference only — choose pickup, scheduled, or realtime (when
          enabled) at checkout. Realtime availability is confirmed there.
        </p>
      </div>
    </Modal>
  );
}
