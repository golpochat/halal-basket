export type CategoryNode = {
  id: string;
  name: string;
  /** Product Bank category names that belong under this node */
  matchNames?: string[];
  children?: CategoryNode[];
};

/** Enterprise grocery taxonomy (maps onto Product Bank categories). */
export const CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'meat-poultry',
    name: 'Meat & Poultry',
    matchNames: ['Meat & Poultry'],
    children: [
      {
        id: 'chicken',
        name: 'Chicken',
        matchNames: ['Meat & Poultry'],
        children: [
          {
            id: 'chicken-fresh',
            name: 'Fresh cuts',
            matchNames: ['Meat & Poultry'],
          },
          {
            id: 'chicken-frozen',
            name: 'Frozen',
            matchNames: ['Meat & Poultry'],
          },
        ],
      },
      {
        id: 'beef-lamb',
        name: 'Beef & Lamb',
        matchNames: ['Meat & Poultry'],
        children: [
          { id: 'beef', name: 'Beef', matchNames: ['Meat & Poultry'] },
          { id: 'lamb', name: 'Lamb', matchNames: ['Meat & Poultry'] },
        ],
      },
    ],
  },
  {
    id: 'fruits-veg',
    name: 'Fruits & Vegetables',
    matchNames: ['Produce', 'Fruits & Vegetables'],
    children: [
      {
        id: 'fruits',
        name: 'Fruits',
        matchNames: ['Produce', 'Fruits & Vegetables'],
        children: [
          {
            id: 'fruits-fresh',
            name: 'Fresh fruit',
            matchNames: ['Produce'],
          },
        ],
      },
      {
        id: 'vegetables',
        name: 'Vegetables',
        matchNames: ['Produce', 'Fruits & Vegetables'],
        children: [
          {
            id: 'veg-leafy',
            name: 'Leafy greens',
            matchNames: ['Produce'],
          },
        ],
      },
    ],
  },
  {
    id: 'cooking',
    name: 'Cooking Essentials',
    matchNames: ['Pantry', 'Cooking Essentials'],
    children: [
      {
        id: 'oils-spices',
        name: 'Oils & Spices',
        matchNames: ['Pantry'],
        children: [
          { id: 'oils', name: 'Cooking oils', matchNames: ['Pantry'] },
          { id: 'spices', name: 'Spices', matchNames: ['Pantry'] },
        ],
      },
      {
        id: 'grains',
        name: 'Rice & Grains',
        matchNames: ['Pantry'],
        children: [
          { id: 'rice', name: 'Rice', matchNames: ['Pantry'] },
          { id: 'flour', name: 'Flour & atta', matchNames: ['Pantry'] },
        ],
      },
    ],
  },
  {
    id: 'beverages',
    name: 'Beverages',
    matchNames: ['Beverages', 'Drinks'],
    children: [
      {
        id: 'tea-coffee',
        name: 'Tea & Coffee',
        matchNames: ['Beverages'],
        children: [{ id: 'tea', name: 'Tea', matchNames: ['Beverages'] }],
      },
      {
        id: 'soft-drinks',
        name: 'Soft drinks',
        matchNames: ['Beverages'],
      },
    ],
  },
  {
    id: 'home-cleaning',
    name: 'Home & Cleaning',
    matchNames: ['Household', 'Home & Cleaning'],
    children: [
      {
        id: 'cleaning',
        name: 'Cleaning',
        matchNames: ['Household'],
        children: [
          { id: 'laundry', name: 'Laundry', matchNames: ['Household'] },
        ],
      },
    ],
  },
  {
    id: 'dairy',
    name: 'Dairy & Eggs',
    matchNames: ['Dairy', 'Dairy & Eggs'],
    children: [
      { id: 'milk', name: 'Milk', matchNames: ['Dairy'] },
      { id: 'eggs', name: 'Eggs', matchNames: ['Dairy'] },
    ],
  },
];

const ROOT_IDS = new Set(CATEGORY_TREE.map((n) => n.id));

export function findCategoryNode(
  id: string,
  nodes: CategoryNode[] = CATEGORY_TREE,
): CategoryNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findCategoryNode(id, n.children);
      if (found) return found;
    }
  }
  return null;
}

/** Ancestor ids from root to `id` (inclusive), for breadcrumbs / browsePath. */
export function categoryPathIds(
  id: string,
  nodes: CategoryNode[] = CATEGORY_TREE,
  trail: string[] = [],
): string[] | null {
  for (const n of nodes) {
    const next = [...trail, n.id];
    if (n.id === id) return next;
    if (n.children) {
      const found = categoryPathIds(id, n.children, next);
      if (found) return found;
    }
  }
  return null;
}

export function collectMatchNames(node: CategoryNode): string[] {
  const set = new Set<string>();
  function walk(n: CategoryNode) {
    for (const m of n.matchNames ?? []) set.add(m);
    for (const c of n.children ?? []) walk(c);
  }
  walk(node);
  return Array.from(set);
}

function parentIdOf(
  id: string,
  nodes: CategoryNode[] = CATEGORY_TREE,
  parent: string | null = null,
): string | null | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (n.children) {
      const found = parentIdOf(id, n.children, n.id);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function collectLeaves(
  nodes: CategoryNode[] = CATEGORY_TREE,
  out: CategoryNode[] = [],
): CategoryNode[] {
  for (const n of nodes) {
    if (!n.children?.length) out.push(n);
    else collectLeaves(n.children, out);
  }
  return out;
}

/** Chip shown for a leaf: mid-level parent, or the leaf when under a root. */
export function popularDisplayId(leafId: string): string {
  const parent = parentIdOf(leafId) ?? null;
  if (parent && !ROOT_IDS.has(parent)) return parent;
  return leafId;
}

/**
 * Client fallback when the API has no/insufficient data:
 * mid-level browse chips (not root categories).
 */
export function popularCategories(max = 8): CategoryNode[] {
  const seen = new Set<string>();
  const out: CategoryNode[] = [];
  for (const leaf of collectLeaves()) {
    const id = popularDisplayId(leaf.id);
    if (seen.has(id)) continue;
    seen.add(id);
    const node = findCategoryNode(id);
    if (!node) continue;
    out.push(node);
    if (out.length >= max) break;
  }
  return out;
}

/** Resolve featured list for UI: API wins; fall back to static mid-level chips. */
export function resolveFeaturedCategories(
  fromApi: Array<{ id: string; name: string }> | undefined | null,
): CategoryNode[] {
  if (fromApi && fromApi.length > 0) {
    return fromApi
      .map(
        (item) =>
          findCategoryNode(item.id) ?? {
            id: item.id,
            name: item.name,
          },
      )
      .filter((n): n is CategoryNode => Boolean(n?.id && n?.name));
  }
  return popularCategories();
}
