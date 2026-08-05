/**
 * Catalogue taxonomy for popular-category ranking.
 * Keep in sync with shared/src/web/catalogue/taxonomy.ts
 */

export type CatalogueNode = {
  id: string;
  name: string;
  matchNames?: string[];
  keywords?: string[];
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
            keywords: [
              'naan',
              'pita',
              'bread',
              'papad',
              'papadum',
              'chapati',
              'roti',
            ],
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

function depthOf(
  id: string,
  index: CatalogueIndex = buildCatalogueIndex(),
): number {
  let d = 0;
  let cur: string | null | undefined = id;
  while (cur) {
    d += 1;
    cur = index.parentId.get(cur) ?? null;
    if (cur === null) break;
  }
  return d;
}

/**
 * Map a sold product → taxonomy leaf using Product Bank category + name keywords.
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

  const nameLower = productName.toLowerCase();
  const nameTokens = new Set(tokens(productName));
  let best: CatalogueNode | null = null;
  let bestScore = -1;

  for (const leaf of byMatch) {
    const nameHints = tokens(leaf.name).filter((t) => !LEAF_NAME_STOP.has(t));
    const kwHints = (leaf.keywords ?? []).flatMap((k) => tokens(k));
    const hints = [...nameHints, ...kwHints];
    let score = 0;
    for (const hint of hints) {
      if (nameTokens.has(hint)) score += 4;
      else if (nameLower.includes(hint)) score += 3;
      else if (
        [...nameTokens].some((n) => n.includes(hint) || hint.includes(n))
      )
        score += 1;
    }
    for (const kw of leaf.keywords ?? []) {
      const phrase = kw.toLowerCase().trim();
      if (phrase.includes(' ') && nameLower.includes(phrase)) score += 6;
    }
    if (
      nameLower.includes('frozen') &&
      (leaf.keywords ?? []).some((k) => k.toLowerCase().includes('frozen'))
    ) {
      score += 12;
    }
    const weighted = score * 10 + depthOf(leaf.id, index);
    if (weighted > bestScore) {
      bestScore = weighted;
      best = leaf;
    }
  }

  if (best && bestScore >= 10) return best.id;
  return byMatch[0]?.id ?? null;
}
