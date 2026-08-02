/**
 * Temporary Phase D2 fixture: Demo has rice only; Swords has chicken only.
 * Shared Swords zone → mixed basket requires FEATURE_MULTI_SHOP split.
 * Run: node scripts/phase-d2-split-fixture.js [apply|restore]
 */
const { PrismaClient } = require('../prisma/generated/client');

const prisma = new PrismaClient();
const DEMO = '00000000-0000-4000-8000-000000000001';
const SWORDS = '99da2581-e87d-4bca-bf15-51cf52585734';
const RICE = '5514b0e5-75c2-473c-85a4-80e2019532d6';
const CHICKEN = '9737f8c7-0018-4967-a285-90c49b25ce39';

async function upsert(shopId, productId, data) {
  const existing = await prisma.shopProduct.findFirst({
    where: { shopId, productId },
  });
  if (existing) {
    return prisma.shopProduct.update({
      where: { id: existing.id },
      data,
    });
  }
  return prisma.shopProduct.create({
    data: {
      shopId,
      productId,
      price: data.price ?? 9.99,
      ...data,
    },
  });
}

async function apply() {
  await upsert(DEMO, RICE, {
    stockQuantity: 50,
    isInStock: true,
    isVisible: true,
    price: 12.99,
  });
  await upsert(DEMO, CHICKEN, {
    stockQuantity: 0,
    isInStock: false,
    isVisible: true,
    price: 8.99,
  });
  await upsert(SWORDS, CHICKEN, {
    stockQuantity: 50,
    isInStock: true,
    isVisible: true,
    price: 8.99,
  });
  await upsert(SWORDS, RICE, {
    stockQuantity: 0,
    isInStock: false,
    isVisible: true,
    price: 12.99,
  });
}

async function restore() {
  for (const shopId of [DEMO, SWORDS]) {
    for (const productId of [RICE, CHICKEN]) {
      await upsert(shopId, productId, {
        stockQuantity: 50,
        isInStock: true,
        isVisible: true,
      });
    }
  }
}

async function dump() {
  const rows = await prisma.shopProduct.findMany({
    where: {
      shopId: { in: [DEMO, SWORDS] },
      productId: { in: [RICE, CHICKEN] },
    },
    select: {
      shopId: true,
      productId: true,
      stockQuantity: true,
      isInStock: true,
      price: true,
    },
  });
  console.log(JSON.stringify(rows, null, 2));
}

const mode = process.argv[2] || 'apply';

(async () => {
  if (mode === 'restore') await restore();
  else await apply();
  await dump();
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
