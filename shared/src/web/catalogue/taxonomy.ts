import { t } from '../i18n';

export type CategoryNode = {
  id: string;
  name: string;
  /** Product Bank category names that belong under this node */
  matchNames?: string[];
  /**
   * Extra name tokens used when mapping a product into this leaf
   * (beyond the display `name`).
   */
  keywords?: string[];
  children?: CategoryNode[];
};

/** Localized display name for a taxonomy node (English `name` stays for Product Bank matching). */
export function categoryDisplayName(
  node: Pick<CategoryNode, 'id' | 'name'>,
  lang = 'en',
): string {
  const key = `taxonomy.${node.id}`;
  const translated = t(key, lang);
  return translated === key ? node.name : translated;
}

/**
 * Enterprise grocery taxonomy (maps onto Product Bank categories).
 * Leaf `keywords` drive product → leaf placement in the customer catalogue.
 */
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
            keywords: [
              'chicken',
              'thigh',
              'thighs',
              'breast',
              'keema',
              'whole',
              'poultry',
              'drumstick',
              'drumsticks',
              'wing',
              'wings',
              'leg',
              'legs',
            ],
          },
          {
            id: 'chicken-frozen',
            name: 'Frozen',
            matchNames: ['Meat & Poultry'],
            keywords: ['frozen', 'iqf', 'frozen chicken'],
          },
        ],
      },
      {
        id: 'beef-lamb',
        name: 'Beef & Lamb',
        matchNames: ['Meat & Poultry'],
        children: [
          {
            id: 'beef',
            name: 'Beef',
            matchNames: ['Meat & Poultry'],
            keywords: ['beef', 'cow', 'keema'],
          },
          {
            id: 'lamb',
            name: 'Lamb',
            matchNames: ['Meat & Poultry'],
            keywords: ['lamb', 'mutton', 'goat', 'keema'],
          },
        ],
      },
      {
        id: 'fish',
        name: 'Fish & Seafood',
        matchNames: ['Meat & Poultry'],
        keywords: [
          'fish',
          'hilsa',
          'ilish',
          'rohu',
          'seafood',
          'steak',
          'steaks',
          'salmon',
          'prawn',
          'prawns',
          'shrimp',
          'pomfret',
          'fillet',
          'fillets',
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
            matchNames: ['Produce', 'Fruits & Vegetables'],
            keywords: [
              'date',
              'dates',
              'medjool',
              'ajwa',
              'mango',
              'fruit',
              'banana',
              'apple',
              'pomegranate',
              'guava',
              'papaya',
              'orange',
              'grape',
              'grapes',
            ],
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
            matchNames: ['Produce', 'Fruits & Vegetables'],
            keywords: [
              'spinach',
              'coriander',
              'cilantro',
              'mint',
              'lettuce',
              'leafy',
              'greens',
              'saag',
              'palak',
              'bunch',
              'methi',
              'fenugreek leaves',
              'parsley',
            ],
          },
          {
            id: 'veg-everyday',
            name: 'Everyday vegetables',
            matchNames: ['Produce', 'Fruits & Vegetables'],
            keywords: [
              'onion',
              'onions',
              'garlic',
              'ginger',
              'tomato',
              'tomatoes',
              'potato',
              'potatoes',
              'chilli',
              'chillies',
              'chili',
              'chilies',
            ],
          },
          {
            id: 'veg-asian',
            name: 'Asian vegetables',
            matchNames: ['Produce', 'Fruits & Vegetables'],
            keywords: [
              'okra',
              'bhindi',
              'aubergine',
              'eggplant',
              'brinjal',
              'baingan',
              'gourd',
              'lauki',
              'karela',
              'bitter',
              'bottle',
              'beans',
              'green beans',
              'yardlong',
            ],
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
        matchNames: ['Pantry', 'Cooking Essentials'],
        children: [
          {
            id: 'oils',
            name: 'Cooking oils',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: [
              'oil',
              'oils',
              'ghee',
              'olive',
              'mustard',
              'sunflower',
              'tahini',
              'coconut milk',
            ],
          },
          {
            id: 'spices',
            name: 'Spices',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: [
              'spice',
              'spices',
              'masala',
              'turmeric',
              'cumin',
              'coriander powder',
              'chilli powder',
              'chili powder',
              'garam',
              'biryani',
              'cardamom',
              'clove',
              'cloves',
              'cinnamon',
              'pepper',
              'peppercorn',
              'peppercorns',
              'bay',
              'zaatar',
              'sumac',
              'baharat',
              'phoron',
              'fenugreek',
              'mustard seeds',
              'haldi',
              'jeera',
            ],
          },
        ],
      },
      {
        id: 'grains',
        name: 'Rice & Grains',
        matchNames: ['Pantry', 'Cooking Essentials'],
        children: [
          {
            id: 'rice',
            name: 'Rice',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: ['rice', 'basmati', 'sella', 'jeera rice'],
          },
          {
            id: 'flour',
            name: 'Flour & atta',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: [
              'flour',
              'atta',
              'besan',
              'suji',
              'semolina',
              'cornflour',
              'chakki',
              'rice flour',
            ],
          },
          {
            id: 'pulses',
            name: 'Dals & pulses',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: [
              'dal',
              'daal',
              'lentil',
              'lentils',
              'chickpea',
              'chickpeas',
              'moong',
              'masoor',
              'toor',
              'urad',
              'chana',
              'bean',
              'beans',
              'fava',
              'kidney',
              'rajma',
              'pulse',
              'pulses',
            ],
          },
          {
            id: 'other-grains',
            name: 'Other grains',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: [
              'bulgur',
              'freekeh',
              'couscous',
              'vermicelli',
              'seviyan',
              'wheat',
              'barley',
            ],
          },
        ],
      },
      {
        id: 'pantry-more',
        name: 'Bread & pantry',
        matchNames: ['Pantry', 'Cooking Essentials'],
        children: [
          {
            id: 'bakery',
            name: 'Bread & bakery',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: ['naan', 'pita', 'bread', 'papad', 'papadum', 'chapati', 'roti'],
          },
          {
            id: 'condiments',
            name: 'Pickles & condiments',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: [
              'pickle',
              'achar',
              'tamarind',
              'imli',
              'rose water',
              'blossom',
              'paste',
            ],
          },
          {
            id: 'sweets-pantry',
            name: 'Sweets & desserts',
            matchNames: ['Pantry', 'Cooking Essentials'],
            keywords: [
              'baklava',
              'gulab',
              'jamun',
              'jaggery',
              'gur',
              'sweet',
              'sweets',
              'dessert',
              'halwa',
              'date',
              'dates',
              'medjool',
              'ajwa',
            ],
          },
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
        matchNames: ['Beverages', 'Drinks'],
        children: [
          {
            id: 'tea',
            name: 'Tea',
            matchNames: ['Beverages', 'Drinks'],
            keywords: ['tea', 'chai', 'assam', 'dust'],
          },
          {
            id: 'coffee',
            name: 'Coffee',
            matchNames: ['Beverages', 'Drinks'],
            keywords: ['coffee', 'qahwa', 'arabic coffee'],
          },
        ],
      },
      {
        id: 'soft-drinks',
        name: 'Soft drinks',
        matchNames: ['Beverages', 'Drinks'],
        keywords: [
          'juice',
          'syrup',
          'squash',
          'rooh',
          'afza',
          'drink',
          'mango juice',
          'rose syrup',
        ],
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
        matchNames: ['Household', 'Home & Cleaning'],
        children: [
          {
            id: 'laundry',
            name: 'Laundry',
            matchNames: ['Household', 'Home & Cleaning'],
            keywords: [
              'laundry',
              'detergent',
              'soap',
              'softener',
              'stain',
              'washing',
              'fabric',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'dairy',
    name: 'Dairy & Eggs',
    matchNames: ['Dairy', 'Dairy & Eggs'],
    children: [
      {
        id: 'milk',
        name: 'Milk & yoghurt',
        matchNames: ['Dairy', 'Dairy & Eggs'],
        keywords: [
          'yoghurt',
          'yogurt',
          'doi',
          'labneh',
          'paneer',
          'milk',
          'dairy',
        ],
      },
      {
        id: 'eggs',
        name: 'Eggs',
        matchNames: ['Dairy', 'Dairy & Eggs'],
        keywords: ['egg', 'eggs'],
      },
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

function depthOf(id: string): number {
  return categoryPathIds(id)?.length ?? 0;
}

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s&]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && t !== 'and' && t !== 'the');
}

/** Leaf-name tokens too generic to drive product placement alone. */
const LEAF_NAME_STOP = new Set([
  'fresh',
  'cuts',
  'everyday',
  'asian',
  'other',
  'soft',
  'drinks',
  'bread',
  'pantry',
  'cooking',
  'oils',
  'milk',
  'yoghurt',
  'yogurt',
  'desserts',
  'seafood',
  'grains',
  'pulses',
  'atta',
  'bakery',
  'condiments',
  'pickles',
  'sweets',
  'dessert',
]);

/**
 * Map a sold product → taxonomy leaf using Product Bank category + name keywords.
 */
export function resolveProductLeafId(
  productName: string,
  productBankCategory: string | null | undefined,
): string | null {
  const pb = productBankCategory?.trim() ?? '';
  const leaves = collectLeaves();
  const byMatch = pb
    ? leaves.filter((leaf) =>
        (leaf.matchNames ?? []).some(
          (m) => m.toLowerCase() === pb.toLowerCase(),
        ),
      )
    : leaves;

  if (byMatch.length === 0) return null;

  const nameLower = productName.toLowerCase();
  const nameTokens = new Set(tokens(productName));
  let best: CategoryNode | null = null;
  let bestScore = -1;

  for (const leaf of byMatch) {
    const nameHints = tokens(leaf.name).filter((t) => !LEAF_NAME_STOP.has(t));
    const kwHints = (leaf.keywords ?? []).flatMap((k) => tokens(k));
    const hints = [...nameHints, ...kwHints];
    let score = 0;
    for (const hint of hints) {
      if (nameTokens.has(hint)) score += 4;
      else if (nameLower.includes(hint)) score += 3;
      else if ([...nameTokens].some((n) => n.includes(hint) || hint.includes(n)))
        score += 1;
    }
    // Multi-word keyword phrases (e.g. "coconut milk", "chilli powder")
    for (const kw of leaf.keywords ?? []) {
      const phrase = kw.toLowerCase().trim();
      if (phrase.includes(' ') && nameLower.includes(phrase)) score += 6;
    }
    // Prefer frozen leaf when the product name says frozen
    if (
      nameLower.includes('frozen') &&
      (leaf.keywords ?? []).some((k) => k.toLowerCase().includes('frozen'))
    ) {
      score += 12;
    }
    const weighted = score * 10 + depthOf(leaf.id);
    if (weighted > bestScore) {
      bestScore = weighted;
      best = leaf;
    }
  }

  // Require at least one keyword hit; otherwise fall back to first leaf under that bank category
  if (best && bestScore >= 10) return best.id;
  return byMatch[0]?.id ?? null;
}

/** True when product belongs under `browseNodeId` (that node or any descendant leaf). */
export function productMatchesBrowseNode(
  productName: string,
  productBankCategory: string | null | undefined,
  browseNodeId: string,
): boolean {
  const leafId = resolveProductLeafId(productName, productBankCategory);
  if (!leafId) {
    const node = findCategoryNode(browseNodeId);
    if (!node) return false;
    const names = collectMatchNames(node);
    const cat = productBankCategory?.trim() ?? '';
    return names.some((n) => n.toLowerCase() === cat.toLowerCase());
  }
  const path = categoryPathIds(leafId);
  return path ? path.includes(browseNodeId) : false;
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
