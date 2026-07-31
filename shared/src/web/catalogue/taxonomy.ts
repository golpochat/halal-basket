export type CategoryNode = {
  id: string;
  name: string;
  /** Product Bank category names that belong under this node */
  matchNames?: string[];
  popular?: boolean;
  children?: CategoryNode[];
};

/** Enterprise grocery taxonomy (maps onto Product Bank categories). */
export const CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'meat-poultry',
    name: 'Meat & Poultry',
    popular: true,
    matchNames: ['Meat & Poultry'],
    children: [
      {
        id: 'chicken',
        name: 'Chicken',
        matchNames: ['Meat & Poultry'],
        children: [
          { id: 'chicken-fresh', name: 'Fresh cuts', matchNames: ['Meat & Poultry'] },
          { id: 'chicken-frozen', name: 'Frozen', matchNames: ['Meat & Poultry'] },
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
    popular: true,
    matchNames: ['Produce', 'Fruits & Vegetables'],
    children: [
      {
        id: 'fruits',
        name: 'Fruits',
        matchNames: ['Produce', 'Fruits & Vegetables'],
        children: [
          { id: 'fruits-fresh', name: 'Fresh fruit', matchNames: ['Produce'] },
        ],
      },
      {
        id: 'vegetables',
        name: 'Vegetables',
        matchNames: ['Produce', 'Fruits & Vegetables'],
        children: [
          { id: 'veg-leafy', name: 'Leafy greens', matchNames: ['Produce'] },
        ],
      },
    ],
  },
  {
    id: 'cooking',
    name: 'Cooking Essentials',
    popular: true,
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
    popular: true,
    matchNames: ['Beverages', 'Drinks'],
    children: [
      {
        id: 'tea-coffee',
        name: 'Tea & Coffee',
        matchNames: ['Beverages'],
        children: [
          { id: 'tea', name: 'Tea', matchNames: ['Beverages'] },
        ],
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
    popular: true,
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

export function popularCategories(
  nodes: CategoryNode[] = CATEGORY_TREE,
): CategoryNode[] {
  return nodes.filter((n) => n.popular);
}
