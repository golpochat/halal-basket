import { useState } from 'react';
import {
  CATEGORY_TREE,
  categoryIcon,
  UtilityIcons,
  ICON_SIZES,
  useCatalogueStore,
  type CategoryNode,
} from '@halal-basket/web';

function TreeNode({
  node,
  depth,
}: {
  node: CategoryNode;
  depth: number;
}) {
  const active = useCatalogueStore((s) => s.category);
  const setCategory = useCatalogueStore((s) => s.setCategory);
  const setSidebarOpen = useCatalogueStore((s) => s.setSidebarOpen);
  const hasChildren = Boolean(node.children?.length);
  const [open, setOpen] = useState(depth < 1 || active.startsWith(node.id));
  const isActive = active === node.id;

  return (
    <div>
      <div className="flex items-center gap-0.5">
        {hasChildren && (
          <button
            type="button"
            className="rounded p-1 text-[var(--hb-ink)]/50 hover:bg-[var(--hb-mist)] hover:text-[var(--hb-green)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)]"
            aria-expanded={open}
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={() => setOpen((v) => !v)}
          >
            <span
              className={`inline-flex transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
            >
              {UtilityIcons.chevronRight({ size: 14 })}
            </span>
          </button>
        )}
        {!hasChildren && <span className="w-6" />}
        <button
          type="button"
          onClick={() => {
            setCategory(node.id);
            setSidebarOpen(false);
          }}
          className={`flex min-w-0 flex-1 items-center gap-[var(--hb-icon-gap)] rounded-[var(--hb-radius)] px-2 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)] ${
            isActive
              ? 'bg-[var(--hb-green)] text-white'
              : 'text-[var(--hb-ink)]/75 hover:bg-[var(--hb-mist)]'
          }`}
          aria-current={isActive ? 'page' : undefined}
        >
          <span
            className={
              isActive
                ? 'text-white [&_.hb-icon-brand]:filter-none'
                : 'text-[var(--hb-icon-brand-green)]'
            }
          >
            {categoryIcon(node.id, {
              size: depth === 0 ? ICON_SIZES.sm : 20,
            })}
          </span>
          <span className="truncate">{node.name}</span>
        </button>
      </div>
      {hasChildren && open && (
        <div className="ml-2 border-l border-[rgba(26,92,58,0.1)] pl-1">
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
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

  const list = (
    <nav aria-label="Categories" className="flex flex-col gap-0.5 p-3 pb-8">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--hb-ink)]/45">
        Categories
      </p>
      <button
        type="button"
        onClick={() => {
          setCategory('all');
          setSidebarOpen(false);
        }}
        className={`mb-1 rounded-[var(--hb-radius)] px-3 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)] ${
          active === 'all'
            ? 'bg-[var(--hb-green)] text-white'
            : 'text-[var(--hb-ink)]/80 hover:bg-[var(--hb-mist)]'
        }`}
        aria-current={active === 'all' ? 'page' : undefined}
      >
        All products
      </button>
      <p className="mb-1 mt-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--hb-ink)]/40">
        Popular
      </p>
      {CATEGORY_TREE.filter((n) => n.popular).map((n) => (
        <button
          key={`pin-${n.id}`}
          type="button"
          onClick={() => {
            setCategory(n.id);
            setSidebarOpen(false);
          }}
          className={`flex items-center gap-[var(--hb-icon-gap)] rounded-[var(--hb-radius)] px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(47,143,91,0.28)] ${
            active === n.id
              ? 'bg-[var(--hb-mist)] text-[var(--hb-green)]'
              : 'text-[var(--hb-ink)]/70 hover:bg-white/70'
          }`}
        >
          <span className="text-[var(--hb-icon-brand-green)]">
            {categoryIcon(n.id, { size: 20 })}
          </span>
          {n.name}
        </button>
      ))}
      <p className="mb-1 mt-3 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--hb-ink)]/40">
        Browse
      </p>
      {CATEGORY_TREE.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
    </nav>
  );

  return (
    <>
      <aside
        id="category-sidebar"
        className={`hidden shrink-0 overflow-hidden border-[rgba(26,92,58,0.1)] bg-white/70 transition-[width] duration-200 ease-out lg:block ${
          collapsed ? 'w-0 border-0' : 'w-60 border-r xl:w-64'
        }`}
        aria-hidden={collapsed}
      >
        <div className="sticky top-14 h-[calc(100dvh-3.5rem)] w-60 overflow-y-auto sm:top-16 sm:h-[calc(100dvh-4rem)] xl:w-64">
          {list}
        </div>
      </aside>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
          aria-label="Close categories"
          onClick={() => setSidebarOpen(false)}
          tabIndex={open ? 0 : -1}
        />
        <aside
          className={`relative z-10 flex h-full w-[min(20rem,90vw)] flex-col bg-[var(--hb-cream)] shadow-[var(--hb-shadow-lg)] transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
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
