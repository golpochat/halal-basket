import { PrismaClient, UserRole, Weekday } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'HalalBasket123!';

async function upsertUser(input: {
  email: string;
  role: UserRole;
  passwordHash: string;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      isActive: true,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  const superAdmin = await upsertUser({
    email: 'superadmin@halalbasket.ie',
    role: UserRole.super_admin,
    passwordHash,
  });

  const admin = await upsertUser({
    email: 'admin@halalbasket.ie',
    role: UserRole.admin,
    passwordHash,
  });

  const shopUser = await upsertUser({
    email: 'shop@halalbasket.ie',
    role: UserRole.shop,
    passwordHash,
  });

  const driverUser = await upsertUser({
    email: 'driver@halalbasket.ie',
    role: UserRole.driver,
    passwordHash,
  });

  const shop = await prisma.shop.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {
      name: 'Halal Basket Demo Shop',
      address: 'Main Street, Lucan, Co. Dublin',
      phone: '+353 1 000 0000',
      email: 'shop@halalbasket.ie',
      deliveryZones: ['Lucan', 'Swords', 'Tallaght'],
      lat: 53.3574,
      lng: -6.4473,
      isActive: true,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Halal Basket Demo Shop',
      address: 'Main Street, Lucan, Co. Dublin',
      phone: '+353 1 000 0000',
      email: 'shop@halalbasket.ie',
      deliveryZones: ['Lucan', 'Swords', 'Tallaght'],
      lat: 53.3574,
      lng: -6.4473,
      isActive: true,
    },
  });

  await prisma.shopUser.upsert({
    where: {
      userId_shopId: { userId: shopUser.id, shopId: shop.id },
    },
    update: {},
    create: { userId: shopUser.id, shopId: shop.id },
  });

  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {
      name: 'Demo Driver',
      phone: '+353 87 000 0000',
      isActive: true,
    },
    create: {
      userId: driverUser.id,
      name: 'Demo Driver',
      phone: '+353 87 000 0000',
      isActive: true,
    },
  });

  const sampleProducts = [
    {
      name: 'Basmati Rice 5kg',
      slug: 'basmati-rice-5kg',
      barcode: '8901001000001',
      sku: 'SKU-RICE-5',
      description: 'Premium long grain',
      price: 12.99,
    },
    {
      name: 'Chicken Thighs 1kg',
      slug: 'chicken-thighs-1kg',
      barcode: '8901001000002',
      sku: 'SKU-CHICK-1',
      description: 'Halal chicken thighs',
      price: 8.5,
    },
    {
      name: 'Olive Oil 1L',
      slug: 'olive-oil-1l',
      barcode: '8901001000003',
      sku: 'SKU-OIL-1',
      description: 'Extra virgin',
      price: 6.75,
    },
  ];

  for (const row of sampleProducts) {
    const product = await prisma.product.upsert({
      where: { barcode: row.barcode },
      update: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        sku: row.sku,
        isActive: true,
        qrCode: `HB-QR-${row.barcode}`,
      },
      create: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        sku: row.sku,
        barcode: row.barcode,
        qrCode: `HB-QR-${row.barcode}`,
        isActive: true,
      },
    });

    await prisma.shopProduct.upsert({
      where: {
        shopId_productId: { shopId: shop.id, productId: product.id },
      },
      update: {
        price: row.price,
        isInStock: true,
        isVisible: true,
      },
      create: {
        shopId: shop.id,
        productId: product.id,
        price: row.price,
        isInStock: true,
        isVisible: true,
      },
    });
  }

  const calendarSeed: Array<{ areaName: string; deliveryDay: Weekday }> = [
    { areaName: 'Lucan', deliveryDay: Weekday.tuesday },
    { areaName: 'Swords', deliveryDay: Weekday.friday },
    { areaName: 'Tallaght', deliveryDay: Weekday.wednesday },
  ];

  for (const row of calendarSeed) {
    await prisma.deliveryCalendar.upsert({
      where: {
        areaName_deliveryDay: {
          areaName: row.areaName,
          deliveryDay: row.deliveryDay,
        },
      },
      update: { isActive: true },
      create: {
        areaName: row.areaName,
        deliveryDay: row.deliveryDay,
        isActive: true,
      },
    });
  }

  console.log('Seeded users:');
  console.log(`  super_admin: ${superAdmin.email}`);
  console.log(`  admin:       ${admin.email}`);
  console.log(`  shop:        ${shopUser.email}`);
  console.log(`  driver:      ${driverUser.email}`);
  console.log(`Password: ${SEED_PASSWORD}`);
  console.log(`Demo shop: ${shop.name} (${shop.id})`);
  console.log('Seeded delivery calendar: Lucan, Swords, Tallaght');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
