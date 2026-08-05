/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('./generated/client');

const prisma = new PrismaClient();

function esc(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  const header =
    'name,slug,category,description,image_url,tags,is_active,barcode,sku';
  const rows = products.map((p) => {
    const tags = Array.isArray(p.tags) ? p.tags.join('|') : '';
    return [
      esc(p.name),
      esc(p.slug),
      esc(p.category?.name ?? ''),
      esc(p.description ?? ''),
      esc(p.imageUrl ?? ''),
      esc(tags),
      p.isActive ? 'true' : 'false',
      esc(p.barcode),
      esc(p.sku ?? ''),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n') + '\n';
  const samplesDir = path.join(__dirname, '..', 'samples');
  fs.writeFileSync(path.join(samplesDir, 'cultural-products.csv'), csv);
  fs.writeFileSync(path.join(samplesDir, 'products.sample.csv'), csv);

  const withImages = products.filter((p) => p.imageUrl).length;
  console.log(
    `Exported ${products.length} products (${withImages} with images) to samples/`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
