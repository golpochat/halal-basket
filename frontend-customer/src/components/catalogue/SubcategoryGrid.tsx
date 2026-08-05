import {
  CategoryIconBadge,
  categoryDisplayName,
  type CategoryNode,
} from '@halal-basket/web';
import { useLocale } from '../../locale/LocaleContext';

export function SubcategoryGrid({
  nodes,
  onSelect,
}: {
  nodes: CategoryNode[];
  onSelect: (id: string) => void;
}) {
  const { t, languageCode } = useLocale();

  if (nodes.length === 0) {
    return (
      <p className="rounded-[var(--hb-radius-lg)] border border-dashed border-[rgba(26,92,58,0.2)] px-6 py-12 text-center text-sm text-[var(--hb-ink)]/55">
        {t('catalogue.noSubcategories')}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {nodes.map((n) => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => onSelect(n.id)}
            className="hb-icon-category-card flex h-full w-full flex-col items-start rounded-[var(--hb-radius-lg)] border border-[rgba(26,92,58,0.12)] bg-white text-left transition hover:-translate-y-0.5 hover:border-[var(--hb-green)] hover:shadow-[var(--hb-shadow)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)]"
          >
            <CategoryIconBadge id={n.id} size="md" />
            <span className="text-sm font-semibold leading-snug sm:text-base">
              {categoryDisplayName(n, languageCode)}
            </span>
            {n.children && n.children.length > 0 && (
              <span className="text-xs text-[var(--hb-ink)]/45">
                {t('catalogue.subcategoryCount', {
                  count: n.children.length,
                })}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
