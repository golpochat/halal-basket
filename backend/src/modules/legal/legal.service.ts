import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
} from './dto/legal.dto';

/** Slugs created by seed — cannot change slug; delete unpublishes only. */
export const SEEDED_LEGAL_SLUGS = [
  'privacy',
  'terms',
  'cookies',
  'refunds',
] as const;

const SEEDED = new Set<string>(SEEDED_LEGAL_SLUGS);

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicFooter() {
    return this.prisma.legalDocument.findMany({
      where: { isPublished: true, showInFooter: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      select: {
        slug: true,
        title: true,
        sortOrder: true,
      },
    });
  }

  async getPublicBySlug(slug: string) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { slug, isPublished: true },
      select: {
        slug: true,
        title: true,
        subtitle: true,
        bodyMarkdown: true,
        version: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
    if (!doc) throw new NotFoundException('Legal document not found');
    return doc;
  }

  listAdmin() {
    return this.prisma.legalDocument.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  async getAdmin(id: string) {
    const doc = await this.prisma.legalDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Legal document not found');
    return {
      ...doc,
      isSeeded: SEEDED.has(doc.slug),
    };
  }

  async create(dto: CreateLegalDocumentDto) {
    const existing = await this.prisma.legalDocument.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Slug already in use: ${dto.slug}`);
    }

    const isPublished = Boolean(dto.isPublished);
    return this.prisma.legalDocument.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        bodyMarkdown: dto.bodyMarkdown,
        sortOrder: dto.sortOrder ?? 100,
        showInFooter: dto.showInFooter ?? true,
        isPublished,
        version: 1,
        publishedAt: isPublished ? new Date() : null,
      },
    });
  }

  async update(id: string, dto: UpdateLegalDocumentDto) {
    const current = await this.prisma.legalDocument.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Legal document not found');

    if (dto.slug && dto.slug !== current.slug) {
      if (SEEDED.has(current.slug)) {
        throw new BadRequestException(
          'Cannot change slug of a seeded legal document',
        );
      }
      const clash = await this.prisma.legalDocument.findUnique({
        where: { slug: dto.slug },
      });
      if (clash) {
        throw new BadRequestException(`Slug already in use: ${dto.slug}`);
      }
    }

    const nextPublished =
      dto.isPublished === undefined ? current.isPublished : dto.isPublished;

    let version = current.version;
    let publishedAt = current.publishedAt;
    if (nextPublished && !current.isPublished) {
      version = current.version + 1;
      publishedAt = new Date();
    } else if (
      nextPublished &&
      dto.bodyMarkdown !== undefined &&
      dto.bodyMarkdown !== current.bodyMarkdown
    ) {
      version = current.version + 1;
      publishedAt = new Date();
    } else if (!nextPublished) {
      publishedAt = current.publishedAt;
    }

    return this.prisma.legalDocument.update({
      where: { id },
      data: {
        slug: dto.slug,
        title: dto.title,
        subtitle: dto.subtitle === undefined ? undefined : dto.subtitle,
        bodyMarkdown: dto.bodyMarkdown,
        sortOrder: dto.sortOrder,
        showInFooter: dto.showInFooter,
        isPublished: dto.isPublished,
        version,
        publishedAt,
      },
    });
  }

  async publish(id: string) {
    const current = await this.prisma.legalDocument.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Legal document not found');

    return this.prisma.legalDocument.update({
      where: { id },
      data: {
        isPublished: true,
        version: current.isPublished ? current.version : current.version + 1,
        publishedAt: new Date(),
      },
    });
  }

  async remove(id: string) {
    const current = await this.prisma.legalDocument.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Legal document not found');

    if (SEEDED.has(current.slug)) {
      return this.prisma.legalDocument.update({
        where: { id },
        data: { isPublished: false },
      });
    }

    await this.prisma.legalDocument.delete({ where: { id } });
    return { deleted: true, id };
  }
}
