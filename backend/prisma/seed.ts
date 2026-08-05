import {
  PrismaClient,
  ShopKind,
  UserRole,
  Weekday,
  Prisma,
} from "./generated/client";
import * as bcrypt from "bcrypt";
import { CULTURAL_PRODUCT_BANK } from "./cultural-product-bank";

const prisma = new PrismaClient();

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "HalalBasket123!";

async function upsertUser(input: {
  email: string;
  role: UserRole;
  passwordHash: string;
  staffRoleId?: string | null;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      passwordHash: input.passwordHash,
      role: input.role,
      staffRoleId: input.staffRoleId ?? null,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    create: {
      email: input.email,
      passwordHash: input.passwordHash,
      role: input.role,
      staffRoleId: input.staffRoleId ?? null,
      isActive: true,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);

  // Sync RBAC catalog (permissions + system roles)
  const { PERMISSION_CATALOG, SYSTEM_STAFF_ROLES, SYSTEM_ROLE_SUPER_ADMIN, SYSTEM_ROLE_ADMIN } =
    await import("../src/modules/rbac/permission-catalog");

  for (const p of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: {
        key: p.key,
        name: p.name,
        description: p.description,
        groupName: p.groupName,
      },
      update: {
        name: p.name,
        description: p.description,
        groupName: p.groupName,
      },
    });
  }

  const allPerms = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  const byKey = new Map(allPerms.map((p) => [p.key, p.id]));
  const allKeys = [...byKey.keys()];

  async function setRolePerms(roleId: string, keys: string[]) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({
      data: keys
        .filter((k) => byKey.has(k))
        .map((key) => ({ roleId, permissionId: byKey.get(key)! })),
    });
  }

  for (const sys of SYSTEM_STAFF_ROLES) {
    await prisma.role.upsert({
      where: { id: sys.id },
      create: {
        id: sys.id,
        name: sys.name,
        slug: sys.slug,
        description: sys.description,
        isSystem: true,
        isActive: true,
      },
      update: {
        name: sys.name,
        description: sys.description,
        isSystem: true,
        isActive: true,
      },
    });
    await setRolePerms(
      sys.id,
      sys.permissionKeys === "all" ? allKeys : [...sys.permissionKeys],
    );
  }

  const superAdmin = await upsertUser({
    email: "superadmin@halalbasket.ie",
    role: UserRole.super_admin,
    passwordHash,
    staffRoleId: SYSTEM_ROLE_SUPER_ADMIN.id,
  });

  const admin = await upsertUser({
    email: "admin@halalbasket.ie",
    role: UserRole.admin,
    passwordHash,
    staffRoleId: SYSTEM_ROLE_ADMIN.id,
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

  // Cultural Product Bank (Option 1: one SKU per pack/format) + shop overlays
  // Ensure product photos are available under /uploads/products
  {
    const fs = await import('fs');
    const path = await import('path');
    const srcDir = path.join(__dirname, 'product-images');
    const destDir = path.join(process.cwd(), 'uploads', 'products');
    fs.mkdirSync(destDir, { recursive: true });
    if (fs.existsSync(srcDir)) {
      for (const file of fs.readdirSync(srcDir)) {
        if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
        fs.copyFileSync(
          path.join(srcDir, file),
          path.join(destDir, file),
        );
      }
    }
  }

  for (const row of CULTURAL_PRODUCT_BANK) {
    const catSlug = row.category
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const category = await prisma.category.upsert({
      where: { slug: catSlug },
      update: { name: row.category },
      create: { name: row.category, slug: catSlug },
    });

    const tagsJson = row.tags as unknown as Prisma.InputJsonValue;
    const product = await prisma.product.upsert({
      where: { barcode: row.barcode },
      update: {
        name: row.name,
        slug: row.slug,
        description: row.description,
        sku: row.sku,
        imageUrl: row.imageUrl,
        tags: tagsJson,
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
        imageUrl: row.imageUrl,
        tags: tagsJson,
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
        {
          code: 'HALAL10',
          type: 'percent',
          value: 10,
          active: true,
          startsAt: null,
          endsAt: null,
          maxLimit: null,
          maxLimitPerUser: null,
        },
        {
          code: 'WELCOME5',
          type: 'fixed',
          value: 5,
          active: true,
          startsAt: null,
          endsAt: null,
          maxLimit: null,
          maxLimitPerUser: 1,
        },
      ]),
    },
    { key: "warehouse_fulfillment_published", value: "false" },
    {
      key: "landing_branding",
      value: JSON.stringify({
        version: 2,
        activeId: "brand-hero-market-spread",
        items: [
          {
            id: "platform-default",
            heroBackgroundUrl: "",
            heroTitle: "Halal groceries delivered or ready for pickup",
            heroSubtitle: "From trusted local shops in Dublin".replace(
              "local shops",
              "local " + "halal" + " shops",
            ),
            isPlatformDefault: true,
          },
          {
            id: "brand-hero-market-spread",
            heroBackgroundUrl: "/uploads/branding/hero-bangladeshi-market-spread.png",
            heroTitle: "Fresh fish, meat & pantry staples",
            heroSubtitle:
              "Hilsa, chicken, beef, lamb, rice, daal, and Bengali vegetables — pickup or delivery across Dublin.",
            isPlatformDefault: false,
          },
          {
            id: "brand-hero-feast-proteins",
            heroBackgroundUrl: "/uploads/branding/hero-bangladeshi-feast-proteins.png",
            heroTitle: "Halal meats & Bengali feast favourites",
            heroSubtitle:
              "Chicken, duck, goat, and river fish with rice, lentils, pitha, misti, and chai.",
            isPlatformDefault: false,
          },
          {
            id: "brand-hero-produce-pantry",
            heroBackgroundUrl: "/uploads/branding/hero-bangladeshi-produce-pantry.png",
            heroTitle: "Vegetables, grains & everyday essentials",
            heroSubtitle:
              "Seasonal produce, chickpeas, daal, rice, doi, sweets, and tea for the family table.",
            isPlatformDefault: false,
          },
          {
            id: "brand-hero-butcher-counter",
            heroBackgroundUrl: "/uploads/branding/hero-bangladeshi-butcher-counter.png",
            heroTitle: "Butcher-fresh, market trusted",
            heroSubtitle:
              "Premium cuts of beef, goat, poultry, and fish — sourced for Dublin’s halal kitchens.",
            isPlatformDefault: false,
          },
          {
            id: "brand-hero-tea-sweets",
            heroBackgroundUrl: "/uploads/branding/hero-bangladeshi-tea-sweets.png",
            heroTitle: "Tea time, misti & comfort classics",
            heroSubtitle:
              "Pitha, doi, dates, biscuits, and chai — the sweet side of a Bangladeshi pantry.",
            isPlatformDefault: false,
          },
          {
            id: "brand-hero-bazaar-harvest",
            heroBackgroundUrl: "/uploads/branding/hero-bangladeshi-bazaar-harvest.png",
            heroTitle: "Bazaar harvest, delivered to your door",
            heroSubtitle:
              "A full Sunday-market spread of greens, spices, grains, fish, and lamb — ready when you are.",
            isPlatformDefault: false,
          },
        ],
      }),
    },
    {
      key: "hero_background_url",
      value: "/uploads/branding/hero-bangladeshi-market-spread.png",
    },
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

  const { LEGAL_DOCUMENT_SEEDS } = await import("./legal-seeds");
  const now = new Date();
  for (const doc of LEGAL_DOCUMENT_SEEDS) {
    await prisma.legalDocument.upsert({
      where: { slug: doc.slug },
      update: {
        title: doc.title,
        subtitle: doc.subtitle,
        bodyMarkdown: doc.bodyMarkdown,
        sortOrder: doc.sortOrder,
        isPublished: true,
        showInFooter: true,
        publishedAt: now,
      },
      create: {
        slug: doc.slug,
        title: doc.title,
        subtitle: doc.subtitle,
        bodyMarkdown: doc.bodyMarkdown,
        sortOrder: doc.sortOrder,
        isPublished: true,
        showInFooter: true,
        version: 1,
        publishedAt: now,
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
  console.log("Seeded legal documents: privacy, terms, cookies, refunds");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
