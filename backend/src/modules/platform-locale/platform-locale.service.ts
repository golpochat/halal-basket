import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCurrencyDto,
  CreateLanguageDto,
  UpdateCurrencyDto,
  UpdateLanguageDto,
} from './dto/platform-locale.dto';

@Injectable()
export class PlatformLocaleService {
  constructor(private readonly prisma: PrismaService) {}

  listCurrencies() {
    return this.prisma.platformCurrency.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  listLanguages() {
    return this.prisma.platformLanguage.findMany({
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async getPublicLocale() {
    const [currencies, languages] = await Promise.all([
      this.prisma.platformCurrency.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.platformLanguage.findMany({
        where: { isPublished: true },
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      }),
    ]);

    const defaultCurrency =
      currencies.find((c) => c.isDefault) ?? currencies[0] ?? null;
    const defaultLanguage =
      languages.find((l) => l.isDefault) ?? languages[0] ?? null;

    return {
      currencies,
      languages,
      showCurrencyPicker: currencies.length > 1,
      showLanguagePicker: languages.length > 1,
      defaultCurrencyCode: defaultCurrency?.code ?? 'EUR',
      defaultLanguageCode: defaultLanguage?.code ?? 'en',
    };
  }

  async getBranding() {
    const row = await this.prisma.platformSetting.findUnique({
      where: { key: 'hero_background_url' },
    });
    return {
      heroBackgroundUrl: row?.value || null,
    };
  }

  async setBranding(heroBackgroundUrl: string) {
    const value = heroBackgroundUrl.trim();
    await this.prisma.platformSetting.upsert({
      where: { key: 'hero_background_url' },
      create: { key: 'hero_background_url', value },
      update: { value },
    });
    return this.getBranding();
  }

  async createCurrency(dto: CreateCurrencyDto) {
    const code = dto.code.toUpperCase();
    try {
      return await this.prisma.platformCurrency.create({
        data: {
          code,
          symbol: dto.symbol,
          name: dto.name,
          exchangeRate: dto.exchangeRate ?? 1,
          isPublished: dto.isPublished ?? false,
          sortOrder: dto.sortOrder ?? 0,
          isDefault: false,
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Currency code already exists');
    }
  }

  async updateCurrency(id: string, dto: UpdateCurrencyDto) {
    const row = await this.requireCurrency(id);
    if (row.isDefault && dto.isPublished === false) {
      throw new BadRequestException('Cannot unpublish the default currency');
    }
    try {
      return await this.prisma.platformCurrency.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.toUpperCase() } : {}),
          ...(dto.symbol !== undefined ? { symbol: dto.symbol } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.exchangeRate !== undefined
            ? { exchangeRate: dto.exchangeRate }
            : {}),
          ...(dto.isPublished !== undefined
            ? { isPublished: dto.isPublished }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Currency code already exists');
    }
  }

  async setCurrencyPublished(id: string, isPublished: boolean) {
    return this.updateCurrency(id, { isPublished });
  }

  async setDefaultCurrency(id: string) {
    const row = await this.requireCurrency(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.platformCurrency.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      return tx.platformCurrency.update({
        where: { id: row.id },
        data: { isDefault: true, isPublished: true },
      });
    });
  }

  async deleteCurrency(id: string) {
    const row = await this.requireCurrency(id);
    if (row.isDefault) {
      throw new BadRequestException('Cannot delete the default currency');
    }
    await this.prisma.platformCurrency.delete({ where: { id } });
    return { deleted: true };
  }

  async createLanguage(dto: CreateLanguageDto) {
    const code = dto.code.toLowerCase();
    try {
      return await this.prisma.platformLanguage.create({
        data: {
          code,
          name: dto.name,
          nativeName: dto.nativeName,
          isRtl: dto.isRtl ?? false,
          isPublished: dto.isPublished ?? false,
          sortOrder: dto.sortOrder ?? 0,
          isDefault: false,
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Language code already exists');
    }
  }

  async updateLanguage(id: string, dto: UpdateLanguageDto) {
    const row = await this.requireLanguage(id);
    if (row.isDefault && dto.isPublished === false) {
      throw new BadRequestException('Cannot unpublish the default language');
    }
    try {
      return await this.prisma.platformLanguage.update({
        where: { id },
        data: {
          ...(dto.code !== undefined ? { code: dto.code.toLowerCase() } : {}),
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.nativeName !== undefined
            ? { nativeName: dto.nativeName }
            : {}),
          ...(dto.isRtl !== undefined ? { isRtl: dto.isRtl } : {}),
          ...(dto.isPublished !== undefined
            ? { isPublished: dto.isPublished }
            : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    } catch (e) {
      this.rethrowUnique(e, 'Language code already exists');
    }
  }

  async setLanguagePublished(id: string, isPublished: boolean) {
    return this.updateLanguage(id, { isPublished });
  }

  async setDefaultLanguage(id: string) {
    const row = await this.requireLanguage(id);
    return this.prisma.$transaction(async (tx) => {
      await tx.platformLanguage.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      return tx.platformLanguage.update({
        where: { id: row.id },
        data: { isDefault: true, isPublished: true },
      });
    });
  }

  async deleteLanguage(id: string) {
    const row = await this.requireLanguage(id);
    if (row.isDefault) {
      throw new BadRequestException('Cannot delete the default language');
    }
    await this.prisma.platformLanguage.delete({ where: { id } });
    return { deleted: true };
  }

  private async requireCurrency(id: string) {
    const row = await this.prisma.platformCurrency.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Currency not found');
    return row;
  }

  private async requireLanguage(id: string) {
    const row = await this.prisma.platformLanguage.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('Language not found');
    return row;
  }

  private rethrowUnique(e: unknown, message: string): never {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new BadRequestException(message);
    }
    throw e;
  }
}
