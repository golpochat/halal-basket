import {
  PrismaClient,
  ShopKind,
  UserRole,
  Weekday,
} from "./generated/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "HalalBasket123!";

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
    email: "superadmin@halalbasket.ie",
    role: UserRole.super_admin,
    passwordHash,
  });

  const admin = await upsertUser({
    email: "admin@halalbasket.ie",
    role: UserRole.admin,
    passwordHash,
  });

  const shopUser = await upsertUser({
    email: "shop@halalbasket.ie",
    role: UserRole.shop,
    passwordHash,
  });

  const driverUser = await upsertUser({
    email: "driver@halalbasket.ie",
    role: UserRole.driver,
    passwordHash,
  });

  const shop = await prisma.shop.upsert({
    where: { id: "00000000-0000-4000-8000-000000000001" },
    update: {
      name: "Halal Basket Demo Shop",
      kind: ShopKind.shop,
      address: "Main Street, Lucan, Co. Dublin",
      phone: "+353 1 000 0000",
      email: "shop@halalbasket.ie",
      deliveryZones: ["Lucan", "Swords", "Tallaght"],
      lat: 53.3574,
      lng: -6.4473,
      isActive: true,
    },
    create: {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Halal Basket Demo Shop",
      kind: ShopKind.shop,
      address: "Main Street, Lucan, Co. Dublin",
      phone: "+353 1 000 0000",
      email: "shop@halalbasket.ie",
      deliveryZones: ["Lucan", "Swords", "Tallaght"],
      lat: 53.3574,
      lng: -6.4473,
      isActive: true,
    },
  });

  const warehouse = await prisma.shop.upsert({
    where: { id: "00000000-0000-4000-8000-0000000000aa" },
    update: {
      name: "HB Dublin Warehouse",
      kind: ShopKind.warehouse,
      address: "Unit 4, Westpoint Business Park, Dublin 22",
      phone: "+353 1 000 0099",
      email: "warehouse@halalbasket.ie",
      deliveryZones: ["Lucan", "Swords", "Tallaght"],
      lat: 53.344,
      lng: -6.42,
      isActive: true,
    },
    create: {
      id: "00000000-0000-4000-8000-0000000000aa",
      name: "HB Dublin Warehouse",
      kind: ShopKind.warehouse,
      address: "Unit 4, Westpoint Business Park, Dublin 22",
      phone: "+353 1 000 0099",
      email: "warehouse@halalbasket.ie",
      deliveryZones: ["Lucan", "Swords", "Tallaght"],
      lat: 53.344,
      lng: -6.42,
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
      name: "Demo Driver",
      phone: "+353 87 000 0000",
      isActive: true,
    },
    create: {
      userId: driverUser.id,
      name: "Demo Driver",
      phone: "+353 87 000 0000",
      isActive: true,
    },
  });

  const sampleProducts = [
    {
      name: "Basmati Rice 5kg",
      slug: "basmati-rice-5kg",
      barcode: "8901001000001",
      sku: "SKU-RICE-5",
      description: "Premium long grain",
      category: "Pantry",
      price: 12.99,
    },
    {
      name: "Chicken Thighs 1kg",
      slug: "chicken-thighs-1kg",
      barcode: "8901001000002",
      sku: "SKU-CHICK-1",
      description: "Halal chicken thighs",
      category: "Meat & Poultry",
      price: 8.5,
    },
    {
      name: "Olive Oil 1L",
      slug: "olive-oil-1l",
      barcode: "8901001000003",
      sku: "SKU-OIL-1",
      description: "Extra virgin",
      category: "Pantry",
      price: 6.75,
    },
  ];

  for (const row of sampleProducts) {
    const catSlug = row.category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const category = await prisma.category.upsert({
      where: { slug: catSlug },
      update: { name: row.category },
      create: { name: row.category, slug: catSlug },
    });

    const product = await prisma.product.upsert({
      where: { barcode: row.barcode },
      update: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        sku: row.sku,
        categoryId: category.id,
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
        categoryId: category.id,
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
        stockQuantity: 100,
        isVisible: true,
      },
      create: {
        shopId: shop.id,
        productId: product.id,
        price: row.price,
        isInStock: true,
        stockQuantity: 100,
        isVisible: true,
      },
    });

    await prisma.shopProduct.upsert({
      where: {
        shopId_productId: {
          shopId: warehouse.id,
          productId: product.id,
        },
      },
      update: {
        price: row.price,
        isInStock: true,
        stockQuantity: 100,
        isVisible: true,
      },
      create: {
        shopId: warehouse.id,
        productId: product.id,
        price: row.price,
        isInStock: true,
        stockQuantity: 100,
        isVisible: true,
      },
    });
  }

  const calendarSeed: Array<{ areaName: string; deliveryDay: Weekday }> = [
    { areaName: "Lucan", deliveryDay: Weekday.tuesday },
    { areaName: "Swords", deliveryDay: Weekday.friday },
    { areaName: "Tallaght", deliveryDay: Weekday.wednesday },
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

  const feeSettings: Array<{ key: string; value: string }> = [
    { key: "delivery_fee_amount", value: "3.99" },
    { key: "pickup_fee_amount", value: "0" },
    { key: "delivery_free_over_amount", value: "0" },
    { key: "delivery_fees_by_area", value: "{}" },
    {
      key: "cart_promo",
      value: JSON.stringify({
        bannerEnabled: true,
        bannerMessage: "You have reduced delivery charge",
      }),
    },
    {
      key: "coupons",
      value: JSON.stringify([
        { code: "HALAL10", type: "percent", value: 10, active: true },
        { code: "WELCOME5", type: "fixed", value: 5, active: true },
      ]),
    },
    { key: "warehouse_fulfillment_published", value: "false" },
  ];
  for (const row of feeSettings) {
    await prisma.platformSetting.upsert({
      where: { key: row.key },
      update: { value: row.value },
      create: row,
    });
  }

  const currencySeed = [
    {
      code: "EUR",
      symbol: "€",
      name: "Euro",
      exchangeRate: 1,
      isDefault: true,
      isPublished: true,
      sortOrder: 0,
    },
    {
      code: "GBP",
      symbol: "£",
      name: "British Pound",
      exchangeRate: 0.86,
      isDefault: false,
      isPublished: false,
      sortOrder: 1,
    },
    {
      code: "USD",
      symbol: "$",
      name: "US Dollar",
      exchangeRate: 1.08,
      isDefault: false,
      isPublished: false,
      sortOrder: 2,
    },
  ];

  for (const row of currencySeed) {
    await prisma.platformCurrency.upsert({
      where: { code: row.code },
      update: {
        symbol: row.symbol,
        name: row.name,
        exchangeRate: row.exchangeRate,
        isDefault: row.isDefault,
        isPublished: row.isPublished,
        sortOrder: row.sortOrder,
      },
      create: row,
    });
  }

  const languageSeed = [
    {
      code: "en",
      name: "English",
      nativeName: "English",
      isRtl: false,
      isDefault: true,
      isPublished: true,
      sortOrder: 0,
    },
    {
      code: "bn",
      name: "Bangla",
      nativeName: "বাংলা",
      isRtl: false,
      isDefault: false,
      isPublished: false,
      sortOrder: 1,
    },
    {
      code: "hi",
      name: "Hindi",
      nativeName: "हिन्दी",
      isRtl: false,
      isDefault: false,
      isPublished: false,
      sortOrder: 2,
    },
    {
      code: "ur",
      name: "Urdu",
      nativeName: "اردو",
      isRtl: true,
      isDefault: false,
      isPublished: false,
      sortOrder: 3,
    },
    {
      code: "ar",
      name: "Arabic",
      nativeName: "العربية",
      isRtl: true,
      isDefault: false,
      isPublished: false,
      sortOrder: 4,
    },
  ];

  for (const row of languageSeed) {
    await prisma.platformLanguage.upsert({
      where: { code: row.code },
      update: {
        name: row.name,
        nativeName: row.nativeName,
        isRtl: row.isRtl,
        isDefault: row.isDefault,
        isPublished: row.isPublished,
        sortOrder: row.sortOrder,
      },
      create: row,
    });
  }

  const featuredSeed = [
    { categoryId: "meat-poultry", sortOrder: 0 },
    { categoryId: "fruits-veg", sortOrder: 1 },
    { categoryId: "cooking", sortOrder: 2 },
    { categoryId: "beverages", sortOrder: 3 },
    { categoryId: "home-cleaning", sortOrder: 4 },
    { categoryId: "dairy", sortOrder: 5 },
  ];

  for (const row of featuredSeed) {
    await prisma.featuredCategory.upsert({
      where: { categoryId: row.categoryId },
      update: {
        sortOrder: row.sortOrder,
        isActive: true,
      },
      create: {
        categoryId: row.categoryId,
        sortOrder: row.sortOrder,
        isActive: true,
      },
    });
  }

  console.log("Seeded users:");
  console.log(`  super_admin: ${superAdmin.email}`);
  console.log(`  admin:       ${admin.email}`);
  console.log(`  shop:        ${shopUser.email}`);
  console.log(`  driver:      ${driverUser.email}`);
  console.log(`Password: ${SEED_PASSWORD}`);
  console.log(`Demo shop: ${shop.name} (${shop.id})`);
  console.log(`Demo warehouse: ${warehouse.name} (${warehouse.id})`);
  console.log("Seeded delivery calendar: Lucan, Swords, Tallaght");
  console.log("Seeded delivery fees: scheduled 3.99, pickup 0");
  console.log("Warehouse fulfillment: unpublished");
  console.log("Seeded currencies: EUR (default published), GBP, USD");
  console.log("Seeded languages: en (default published), bn, hi, ur, ar");
  console.log("Seeded featured categories: 6 catalogue roots");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
