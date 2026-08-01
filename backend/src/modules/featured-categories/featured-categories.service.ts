import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CATALOGUE_ROOT_CATEGORIES,
  CATALOGUE_ROOT_IDS,
  FEATURED_CATEGORY_MAX,
  FEATURED_CATEGORY_MIN,
  catalogueRootName,
} from './catalogue-roots';
import type { ReplaceFeaturedCategoriesDto } from './dto/featured-categories.dto';

@Injectable()
export class FeaturedCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: active featured categories (empty if fewer than min). */
  async getPublic() {
    const rows = await this.prisma.featuredCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { categoryId: 'asc' }],
      take: FEATURED_CATEGORY_MAX,
    });

    const categories = rows
      .map((r) => {
        const name = catalogueRootName(r.categoryId);
        if (!name) return null;
        return {
          id: r.categoryId,
          name,
          sortOrder: r.sortOrder,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c != null);

    if (categories.length < FEATURED_CATEGORY_MIN) {
      return {
        categories: [],
        minVisible: FEATURED_CATEGORY_MIN,
        maxVisible: FEATURED_CATEGORY_MAX,
      };
    }

    return {
      categories,
      minVisible: FEATURED_CATEGORY_MIN,
      maxVisible: FEATURED_CATEGORY_MAX,
    };
  }

  /** Admin: all rows + catalogue roots for the editor. */
  async listAdmin() {
    const rows = await this.prisma.featuredCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { categoryId: 'asc' }],
    });

    return {
      items: rows.map((r) => ({
        id: r.id,
        categoryId: r.categoryId,
        name: catalogueRootName(r.categoryId) ?? r.categoryId,
        sortOrder: r.sortOrder,
        isActive: r.isActive,
      })),
      available: CATALOGUE_ROOT_CATEGORIES.map((c) => ({ ...c })),
      minVisible: FEATURED_CATEGORY_MIN,
      maxVisible: FEATURED_CATEGORY_MAX,
    };
  }

  async replaceAll(dto: ReplaceFeaturedCategoriesDto) {
    const seen = new Set<string>();
    let activeCount = 0;

    for (const item of dto.items) {
      if (!CATALOGUE_ROOT_IDS.has(item.categoryId)) {
        throw new BadRequestException(
          `Unknown category id: ${item.categoryId}`,
        );
      }
      if (seen.has(item.categoryId)) {
        throw new BadRequestException(
          `Duplicate category id: ${item.categoryId}`,
        );
      }
      seen.add(item.categoryId);
      if (item.isActive) activeCount += 1;
    }

    if (activeCount > FEATURED_CATEGORY_MAX) {
      throw new BadRequestException(
        `At most ${FEATURED_CATEGORY_MAX} featured categories can be active`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.featuredCategory.deleteMany();
      if (dto.items.length === 0) return;
      await tx.featuredCategory.createMany({
        data: dto.items.map((item) => ({
          categoryId: item.categoryId,
          sortOrder: item.sortOrder,
          isActive: item.isActive,
        })),
      });
    });

    return this.listAdmin();
  }

  async setActive(categoryId: string, isActive: boolean) {
    const row = await this.prisma.featuredCategory.findUnique({
      where: { categoryId },
    });
    if (!row) throw new NotFoundException('Featured category not found');

    if (isActive) {
      const active = await this.prisma.featuredCategory.count({
        where: { isActive: true, NOT: { categoryId } },
      });
      if (active >= FEATURED_CATEGORY_MAX) {
        throw new BadRequestException(
          `At most ${FEATURED_CATEGORY_MAX} featured categories can be active`,
        );
      }
    }

    await this.prisma.featuredCategory.update({
      where: { categoryId },
      data: { isActive },
    });
    return this.listAdmin();
  }
}
