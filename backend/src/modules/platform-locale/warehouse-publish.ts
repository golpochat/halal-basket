import { Prisma, ShopKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Legacy master switch (boolean string). Migrated into per-warehouse IDs. */
export const WAREHOUSE_PUBLISHED_SETTING_KEY =
  'warehouse_fulfillment_published';

/** JSON string array of warehouse shop IDs published for customer fulfillment. */
export const WAREHOUSE_PUBLISHED_IDS_KEY = 'warehouse_published_ids';

/**
 * Warehouses that may fulfill customer orders / appear in catalogue.
 * Migrates legacy `warehouse_fulfillment_published=true` → all warehouse IDs.
 */
export async function getPublishedWarehouseIds(
  prisma: PrismaService,
): Promise<string[]> {
  const [idsRow, legacyRow, warehouses] = await Promise.all([
    prisma.platformSetting.findUnique({
      where: { key: WAREHOUSE_PUBLISHED_IDS_KEY },
    }),
    prisma.platformSetting.findUnique({
      where: { key: WAREHOUSE_PUBLISHED_SETTING_KEY },
    }),
    prisma.shop.findMany({
      where: { kind: ShopKind.warehouse },
      select: { id: true },
    }),
  ]);

  const allIds = warehouses.map((w) => w.id);
  const allIdSet = new Set(allIds);

  if (idsRow?.value) {
    try {
      const parsed = JSON.parse(idsRow.value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((id): id is string => typeof id === 'string')
          .filter((id) => allIdSet.has(id));
      }
    } catch {
      /* fall through */
    }
  }

  if (legacyRow?.value === 'true') {
    return allIds;
  }

  return [];
}

export async function setPublishedWarehouseIds(
  prisma: PrismaService,
  ids: string[],
): Promise<string[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const value = JSON.stringify(unique);
  await Promise.all([
    prisma.platformSetting.upsert({
      where: { key: WAREHOUSE_PUBLISHED_IDS_KEY },
      create: { key: WAREHOUSE_PUBLISHED_IDS_KEY, value },
      update: { value },
    }),
    // Keep legacy flag in sync for older readers
    prisma.platformSetting.upsert({
      where: { key: WAREHOUSE_PUBLISHED_SETTING_KEY },
      create: {
        key: WAREHOUSE_PUBLISHED_SETTING_KEY,
        value: unique.length > 0 ? 'true' : 'false',
      },
      update: { value: unique.length > 0 ? 'true' : 'false' },
    }),
  ]);
  return unique;
}

/** Prisma where: active shops + published warehouses only. */
export function activeShopsWithPublishedWarehouses(
  publishedWarehouseIds: string[],
): Prisma.ShopWhereInput {
  if (publishedWarehouseIds.length === 0) {
    return { isActive: true, kind: ShopKind.shop };
  }
  return {
    isActive: true,
    OR: [
      { kind: ShopKind.shop },
      { kind: ShopKind.warehouse, id: { in: publishedWarehouseIds } },
    ],
  };
}
