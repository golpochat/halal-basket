/**
 * Seeds 6 custom landing hero branding items + immutable platform default.
 * Images must exist under backend/uploads/branding/.
 *
 * Run from backend/:
 *   npx ts-node --compiler-options "{\"module\":\"CommonJS\"}" prisma/seed-branding-heroes.ts
 */
import { PrismaClient } from "./generated/client";

const prisma = new PrismaClient();

const PLATFORM_DEFAULT_ID = "platform-default";
const DEFAULT_TITLE = "Halal groceries delivered or ready for pickup";
const DEFAULT_SUBTITLE = "From trusted local shops in Dublin".replace(
  "local shops",
  "local " + "halal" + " shops",
);

const HEROES = [
  {
    id: "brand-hero-market-spread",
    file: "hero-bangladeshi-market-spread.png",
    heroTitle: "Fresh fish, meat & pantry staples",
    heroSubtitle:
      "Hilsa, chicken, beef, lamb, rice, daal, and Bengali vegetables — pickup or delivery across Dublin.",
  },
  {
    id: "brand-hero-feast-proteins",
    file: "hero-bangladeshi-feast-proteins.png",
    heroTitle: "Halal meats & Bengali feast favourites",
    heroSubtitle:
      "Chicken, duck, goat, and river fish with rice, lentils, pitha, misti, and chai.",
  },
  {
    id: "brand-hero-produce-pantry",
    file: "hero-bangladeshi-produce-pantry.png",
    heroTitle: "Vegetables, grains & everyday essentials",
    heroSubtitle:
      "Seasonal produce, chickpeas, daal, rice, doi, sweets, and tea for the family table.",
  },
  {
    id: "brand-hero-butcher-counter",
    file: "hero-bangladeshi-butcher-counter.png",
    heroTitle: "Butcher-fresh, market trusted",
    heroSubtitle:
      "Premium cuts of beef, goat, poultry, and fish — sourced for Dublin’s halal kitchens.",
  },
  {
    id: "brand-hero-tea-sweets",
    file: "hero-bangladeshi-tea-sweets.png",
    heroTitle: "Tea time, misti & comfort classics",
    heroSubtitle:
      "Pitha, doi, dates, biscuits, and chai — the sweet side of a Bangladeshi pantry.",
  },
  {
    id: "brand-hero-bazaar-harvest",
    file: "hero-bangladeshi-bazaar-harvest.png",
    heroTitle: "Bazaar harvest, delivered to your door",
    heroSubtitle:
      "A full Sunday-market spread of greens, spices, grains, fish, and lamb — ready when you are.",
  },
] as const;

async function main() {
  const platformDefault = {
    id: PLATFORM_DEFAULT_ID,
    heroBackgroundUrl: "",
    heroTitle: DEFAULT_TITLE,
    heroSubtitle: DEFAULT_SUBTITLE,
    isPlatformDefault: true,
  };

  const customItems = HEROES.map((h) => ({
    id: h.id,
    heroBackgroundUrl: `/uploads/branding/${h.file}`,
    heroTitle: h.heroTitle,
    heroSubtitle: h.heroSubtitle,
    isPlatformDefault: false,
  }));

  const store = {
    version: 2 as const,
    activeId: HEROES[0].id,
    items: [platformDefault, ...customItems],
  };

  await prisma.platformSetting.upsert({
    where: { key: "landing_branding" },
    create: {
      key: "landing_branding",
      value: JSON.stringify(store),
    },
    update: { value: JSON.stringify(store) },
  });

  await prisma.platformSetting.upsert({
    where: { key: "hero_background_url" },
    create: {
      key: "hero_background_url",
      value: customItems[0]!.heroBackgroundUrl,
    },
    update: { value: customItems[0]!.heroBackgroundUrl },
  });

  console.log(
    `Seeded branding: platform default + ${customItems.length} hero items`,
  );
  console.log(`Active hero: ${store.activeId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
