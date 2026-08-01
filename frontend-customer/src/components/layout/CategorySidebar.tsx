import { useState } from 'react';
import {
  CATEGORY_TREE,
  categoryIcon,
  UtilityIcons,
  ICON_SIZES,
  resolveFeaturedCategories,
  useCatalogueStore,
  useFeaturedCategoriesQuery,
  type CategoryNode,
} from '@halal-basket/web';
import { api } from '../../lib/api';

function TreeNode({
  node,
  depth,
  expandedId,
  onExpand,
}: {
  node: CategoryNode;
  depth: number;
  /** Top-level accordion: which browse root is open (null = all collapsed) */
  expandedId: string | null;
  onExpand: (id: string | null) => void;
}) {
  const active = useCatalogueStore((s) => s.category);
  const setCategory = useCatalogueStore((s) => s.setCategory);
  const setSidebarOpen = useCatalogueStore((s) => s.setSidebarOpen);
  const hasChildren = Boolean(node.children?.length);
  const isRoot = depth === 0;
  const [nestedOpen, setNestedOpen] = useState(false);
  const open = isRoot ? expandedId === node.id : nestedOpen;
  const isActive = active === node.id;

  function toggleExpand() {
    if (isRoot) {
      onExpand(open ? null : node.id);
    } else {
      setNestedOpen((v) => !v);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-0.5">
        {hasChildren && (
          <button
            type="button"
            className="rounded p-1 text-[var(--hb-ink)]/50 transition duration-[220ms] ease-[var(--hb-ease-out)] hover:bg-[var(--hb-mist)] hover:text-[var(--hb-green)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)]"
            aria-expanded={open}
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={toggleExpand}
          >
            <span
              className={`inline-flex transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'rotate-90' : ''}`}
            >
              {UtilityIcons.chevronRight({ size: 14 })}
            </span>
          </button>
        )}
        {!hasChildren && <span className="w-6" aria-hidden />}
        <button
          type="button"
          onClick={() => {
            setCategory(node.id);
            if (isRoot && hasChildren) {
              onExpand(node.id);
            }
            setSidebarOpen(false);
          }}
          className={`hb-sidebar-link ${isActive ? 'is-active' : ''}`}
          aria-current={isActive ? 'page' : undefined}
        >
          <span
            className={
              isActive
                ? 'text-white [&_.hb-icon-brand]:filter-none'
                : 'text-[var(--hb-icon-brand-green)]'
            }
            aria-hidden
          >
            {categoryIcon(node.id, {
              size: ICON_SIZES.sm,
            })}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {hasChildren && open && (
        <div className="hb-sidebar-children mt-1 space-y-0.5">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedId={expandedId}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategorySidebar() {
  const active = useCatalogueStore((s) => s.category);
  const setCategory = useCatalogueStore((s) => s.setCategory);
  const open = useCatalogueStore((s) => s.sidebarOpen);
  const collapsed = useCatalogueStore((s) => s.sidebarCollapsed);
  const setSidebarOpen = useCatalogueStore((s) => s.setSidebarOpen);
  const [browseExpandedId, setBrowseExpandedId] = useState<string | null>(
    null,
  );
  const featuredQuery = useFeaturedCategoriesQuery(api);
  const popular = resolveFeaturedCategories(featuredQuery.data?.categories);

  const list = (
    <nav aria-label="Categories" className="flex flex-col p-3 pb-8">
      <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
        Categories
      </p>

      {popular.length > 0 && (
        <div className="hb-sidebar-group">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--hb-ink)]/40">
            Popular
          </p>
          {popular.map((n) => (
            <button
              key={`pin-${n.id}`}
              type="button"
              onClick={() => {
                setCategory(n.id);
                setSidebarOpen(false);
              }}
              className={`hb-sidebar-link w-full ${
                active === n.id ? 'is-active' : ''
              }`}
              aria-current={active === n.id ? 'page' : undefined}
            >
              <span
                className={
                  active === n.id
                    ? 'text-white [&_.hb-icon-brand]:filter-none'
                    : 'text-[var(--hb-icon-brand-green)]'
                }
                aria-hidden
              >
                {categoryIcon(n.id, { size: ICON_SIZES.sm })}
              </span>
              <span className="truncate">{n.name}</span>
            </button>
          ))}
        </div>
      )}

      <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--hb-ink)]/40">
        Browse
      </p>
      {CATEGORY_TREE.map((node) => (
        <div key={node.id} className="hb-sidebar-group">
          <TreeNode
            node={node}
            depth={0}
            expandedId={browseExpandedId}
            onExpand={setBrowseExpandedId}
          />
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <aside
        id="category-sidebar"
        className={`hb-sidebar-rail bg-white/70 ${collapsed ? '' : 'is-open'}`}
        aria-hidden={collapsed}
      >
        <div className="hb-sidebar-rail__panel sticky top-16 h-[calc(100dvh-4rem)] overflow-y-auto sm:top-20 sm:h-[calc(100dvh-5rem)]">
          {list}
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`hb-sidebar-scrim absolute inset-0 bg-black/35 ${open ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Close categories"
          onClick={() => setSidebarOpen(false)}
          tabIndex={open ? 0 : -1}
        />
        <aside
          className={`hb-sidebar-sheet relative z-10 flex h-full w-[min(20rem,90vw)] flex-col bg-[var(--hb-cream)] shadow-[var(--hb-shadow-lg)] ${
            open
              ? 'translate-x-0 shadow-[var(--hb-shadow-lg)]'
              : '-translate-x-full shadow-none'
          }`}
          aria-label="Category navigation"
        >
          <div className="flex items-center justify-between border-b border-[rgba(26,92,58,0.1)] px-4 py-3">
            <p className="font-semibold">Categories</p>
            <button
              type="button"
              className="hb-icon-btn"
              aria-label="Close categories"
              onClick={() => setSidebarOpen(false)}
            >
              {UtilityIcons.close({ size: ICON_SIZES.sm })}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{list}</div>
        </aside>
      </div>
    </>
  );
}
