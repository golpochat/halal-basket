/**
 * Catalogue taxonomy for popular-category ranking.
 * Keep in sync with shared/src/web/catalogue/taxonomy.ts
 */

export type CatalogueNode = {
  id: string;
  name: string;
  matchNames?: string[];
  children?: CatalogueNode[];
};

export const CATALOGUE_TREE: CatalogueNode[] = [
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

export const POPULAR_CATEGORY_MIN = 3;
export const POPULAR_CATEGORY_MAX = 8;
export const POPULAR_LOOKBACK_DAYS = 30;

const ROOT_IDS = new Set(CATALOGUE_TREE.map((n) => n.id));

export type CatalogueIndex = {
  byId: Map<string, CatalogueNode>;
  parentId: Map<string, string | null>;
  leaves: CatalogueNode[];
};

export function buildCatalogueIndex(
  nodes: CatalogueNode[] = CATALOGUE_TREE,
): CatalogueIndex {
  const byId = new Map<string, CatalogueNode>();
  const parentId = new Map<string, string | null>();
  const leaves: CatalogueNode[] = [];

  function walk(node: CatalogueNode, parent: string | null) {
    byId.set(node.id, node);
    parentId.set(node.id, parent);
    if (!node.children?.length) {
      leaves.push(node);
      return;
    }
    for (const child of node.children) walk(child, node.id);
  }

  for (const root of nodes) walk(root, null);
  return { byId, parentId, leaves };
}

/**
 * Popular chip for a leaf: parent when parent is not a root; otherwise the leaf.
 */
export function popularDisplayId(
  leafId: string,
  index: CatalogueIndex = buildCatalogueIndex(),
): string {
  const parent = index.parentId.get(leafId) ?? null;
  if (parent && !ROOT_IDS.has(parent)) return parent;
  return leafId;
}

export function catalogueName(
  id: string,
  index: CatalogueIndex = buildCatalogueIndex(),
): string | null {
  return index.byId.get(id)?.name ?? null;
}

/** Default chips when order history is thin (tree order, deduped). */
export function defaultPopularDisplayIds(
  index: CatalogueIndex = buildCatalogueIndex(),
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const leaf of index.leaves) {
    const id = popularDisplayId(leaf.id, index);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && t !== 'and' && t !== 'the');
}

/**
 * Map a sold product → taxonomy leaf using Product Bank category + name hints.
 */
export function resolveProductLeafId(
  productName: string,
  productBankCategory: string | null | undefined,
  index: CatalogueIndex = buildCatalogueIndex(),
): string | null {
  const pb = productBankCategory?.trim() ?? '';
  const byMatch = pb
    ? index.leaves.filter((leaf) =>
        (leaf.matchNames ?? []).some(
          (m) => m.toLowerCase() === pb.toLowerCase(),
        ),
      )
    : index.leaves;

  if (byMatch.length === 0) return null;

  const nameTokens = new Set(tokens(productName));
  let best: CatalogueNode | null = null;
  let bestScore = -1;

  for (const leaf of byMatch) {
    const leafTokens = tokens(leaf.name);
    let score = 0;
    for (const t of leafTokens) {
      if (nameTokens.has(t)) score += 3;
      else if ([...nameTokens].some((n) => n.includes(t) || t.includes(n)))
        score += 1;
    }
    // Prefer more specific (deeper) leaves when scores tie
    const depth = (index.parentId.get(leaf.id) ? 1 : 0) + 1;
    const weighted = score * 10 + depth;
    if (weighted > bestScore) {
      bestScore = weighted;
      best = leaf;
    }
  }

  return best?.id ?? byMatch[0]?.id ?? null;
}
