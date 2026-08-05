const fs = require('fs');
const path = require('path');

const dir = path.join('shared', 'src', 'web', 'i18n', 'packs');

function load(code) {
  const raw = fs.readFileSync(path.join(dir, `${code}.ts`), 'utf8');
  const map = {};
  const re = /'([^']+)':\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(raw))) {
    map[m[1]] = m[2].replace(/\\'/g, "'");
  }
  return map;
}

const codes = ['en', 'bn', 'hi', 'ur', 'ar'];
const packs = Object.fromEntries(codes.map((c) => [c, load(c)]));
const enKeys = Object.keys(packs.en).sort();

const issues = [];

for (const c of codes.slice(1)) {
  const keys = Object.keys(packs[c]);
  for (const k of enKeys) {
    if (!(k in packs[c])) issues.push(`[${c}] MISSING ${k}`);
    if (!packs[c][k]?.trim()) issues.push(`[${c}] EMPTY ${k}`);
    if (packs[c][k] === packs.en[k]) issues.push(`[${c}] UNTRANSLATED ${k}`);
    if (/\uFFFD|Accompanying/.test(packs[c][k] || '')) {
      issues.push(`[${c}] CORRUPT ${k}=${packs[c][k]}`);
    }
    const enVars = [...(packs.en[k].matchAll(/\{(\w+)\}/g))].map((x) => x[1]).sort().join(',');
    const locVars = [...((packs[c][k] || '').matchAll(/\{(\w+)\}/g))].map((x) => x[1]).sort().join(',');
    if (enVars !== locVars) issues.push(`[${c}] PLACEHOLDER ${k} en=${enVars} loc=${locVars}`);
  }
  for (const k of keys) {
    if (!(k in packs.en)) issues.push(`[${c}] EXTRA ${k}`);
  }
}

const synonymGroups = {
  pending: enKeys.filter((k) => packs.en[k] === 'Pending'),
  cancelled: enKeys.filter((k) => packs.en[k] === 'Cancelled'),
  noAnswer: enKeys.filter((k) => packs.en[k] === 'No answer'),
  wrongAddress: enKeys.filter((k) => packs.en[k] === 'Wrong address'),
};

for (const c of codes.slice(1)) {
  for (const [label, keys] of Object.entries(synonymGroups)) {
    const vals = [...new Set(keys.map((k) => packs[c][k]))];
    if (vals.length > 1) {
      issues.push(`[${c}] SYNONYM_DRIFT ${label}: ${vals.join(' | ')}`);
    }
  }
}

// Distinct English meanings must stay distinct after translation
const distinctPairs = [
  ['chrome.deliveryArea', 'footer.deliveryLocations'],
  ['nav.shop', 'footer.shop'],
  ['nav.profile', 'nav.myProfile'],
  ['chrome.searchProducts', 'chrome.searchShort'],
  ['fulfillment.mode.scheduled_delivery', 'fulfillment.mode.realtime_delivery'],
];

for (const c of codes) {
  for (const [a, b] of distinctPairs) {
    if (packs[c][a] === packs[c][b]) {
      issues.push(`[${c}] COLLAPSED_DISTINCT ${a} == ${b} ("${packs[c][a]}")`);
    }
  }
}

// Brand spelling consistency within each pack
const brandKeys = enKeys.filter((k) => /Halal Basket/.test(packs.en[k]));
for (const c of codes) {
  const variants = new Set(
    brandKeys.map((k) => {
      const v = packs[c][k];
      const m = v.match(
        /Halal Basket|হালাল বাস্কেট|हलाल बास्केट|حلال باسکٹ|حلال باسكت/,
      );
      return m ? m[0] : `UNMATCHED:${v}`;
    }),
  );
  if (variants.size > 1) {
    issues.push(`[${c}] BRAND_DRIFT ${[...variants].join(' | ')}`);
  }
}

// Loanword leftovers that we intend to avoid in taxonomy
const bannedLoans = {
  bn: [/ফ্রোজেন/, /সফট ড্রিংকস/, /তাজা কাট$/],
  hi: [/फ्रोज़न/, /सॉफ्ट ड्रिंक्स/, /ताज़ा कट$/],
  ur: [/سافٹ ڈرنکس/, /تازہ کٹ$/],
};

for (const [c, patterns] of Object.entries(bannedLoans)) {
  for (const [k, v] of Object.entries(packs[c])) {
    for (const re of patterns) {
      if (re.test(v)) issues.push(`[${c}] LOANWORD ${k}=${v}`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      keyCounts: Object.fromEntries(codes.map((c) => [c, Object.keys(packs[c]).length])),
      issueCount: issues.length,
      issues,
    },
    null,
    2,
  ),
);

process.exit(issues.length ? 1 : 0);
