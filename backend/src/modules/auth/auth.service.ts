import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MetricsService } from '../../common/metrics.service';
import { normalizeE164 } from '../whatsapp/phone';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  private maxAttempts(): number {
    return Number(this.config.get('LOGIN_MAX_ATTEMPTS') ?? 5);
  }

  private lockMinutes(): number {
    return Number(this.config.get('LOGIN_LOCK_MINUTES') ?? 15);
  }

  async registerCustomer(dto: RegisterCustomerDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        passwordHash,
        role: UserRole.customer,
        customer: {
          create: {
            name: dto.name,
            addressList: [],
          },
        },
      },
      include: { customer: true },
    });

    return this.tokenResponse(user.id, user.email, user.role, user.avatarUrl);
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      this.metrics.inc('loginFailures');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      this.metrics.inc('loginLockouts');
      throw new UnauthorizedException(
        `Account locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      this.metrics.inc('loginFailures');
      const failedLoginCount = user.failedLoginCount + 1;
      const max = this.maxAttempts();
      const data: { failedLoginCount: number; lockedUntil?: Date } = {
        failedLoginCount,
      };
      if (failedLoginCount >= max) {
        data.lockedUntil = new Date(
          Date.now() + this.lockMinutes() * 60 * 1000,
        );
        data.failedLoginCount = 0;
        this.metrics.inc('loginLockouts');
      }
      await this.prisma.user.update({ where: { id: user.id }, data });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null },
    });

    const access = await this.staffAccess(user.id, user.role);
    return {
      ...this.tokenResponse(user.id, user.email, user.role, user.avatarUrl),
      ...access,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true,
        driver: true,
        shopUsers: { include: { shop: true }, take: 1 },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    const access = await this.staffAccess(user.id, user.role);
    return { ...this.profileResponse(user), ...access };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customer: true,
        driver: true,
        shopUsers: { include: { shop: true }, take: 1 },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const changingPassword = Boolean(dto.newPassword);
    if (changingPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      });
      if (taken) throw new ConflictException('Email already in use');
    }

    if (dto.phone !== undefined && dto.phone.trim()) {
      const normalized = normalizeE164(dto.phone);
      if (!normalized) {
        throw new BadRequestException(
          'Phone must be in international format (E.164), e.g. +353871234567',
        );
      }
      if (normalized !== user.phone) {
        const taken = await this.prisma.user.findFirst({
          where: { phone: normalized, NOT: { id: user.id } },
        });
        if (taken) throw new ConflictException('Phone already in use');
      }
    }

    if (dto.whatsappOptIn === true) {
      if (!user.customer) {
        throw new BadRequestException(
          'Only customer accounts can enable WhatsApp updates',
        );
      }
      const phoneForOptIn =
        dto.phone !== undefined
          ? normalizeE164(dto.phone)
          : normalizeE164(user.phone);
      if (!phoneForOptIn) {
        throw new BadRequestException(
          'Add a valid international phone number to enable WhatsApp updates',
        );
      }
    }

    const nextEmail = dto.email?.toLowerCase() ?? user.email;
    let nextPhone: string | null;
    if (dto.phone === undefined) {
      nextPhone = user.phone;
    } else if (!dto.phone.trim()) {
      nextPhone = null;
    } else {
      nextPhone = normalizeE164(dto.phone);
    }

    const optInNext =
      dto.whatsappOptIn !== undefined
        ? dto.whatsappOptIn
        : Boolean(user.customer?.whatsappOptIn);
    if (user.customer && optInNext && !nextPhone) {
      throw new BadRequestException(
        'Add a valid international phone number to enable WhatsApp updates',
      );
    }

    const nextAvatar =
      dto.avatarUrl === undefined
        ? undefined
        : this.normalizeAvatarUrl(dto.avatarUrl);

    let nextAddressList: ReturnType<AuthService['normalizeAddressList']> | null =
      null;
    if (dto.addressList !== undefined) {
      if (!user.customer) {
        throw new BadRequestException(
          'Only customer accounts can save delivery addresses',
        );
      }
      nextAddressList = this.normalizeAddressList(dto.addressList);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          email: nextEmail,
          phone: nextPhone,
          ...(nextAvatar !== undefined ? { avatarUrl: nextAvatar } : {}),
          ...(changingPassword
            ? { passwordHash: await bcrypt.hash(dto.newPassword!, 12) }
            : {}),
        },
      });

      if (dto.name?.trim()) {
        if (user.customer) {
          await tx.customer.update({
            where: { id: user.customer.id },
            data: {
              name: dto.name.trim(),
              ...(dto.whatsappOptIn !== undefined
                ? {
                    whatsappOptIn: dto.whatsappOptIn,
                    whatsappOptInAt: dto.whatsappOptIn
                      ? new Date()
                      : null,
                  }
                : {}),
            },
          });
        }
        if (user.driver) {
          await tx.driver.update({
            where: { id: user.driver.id },
            data: {
              name: dto.name.trim(),
              ...(dto.phone !== undefined
                ? { phone: nextPhone }
                : {}),
            },
          });
        }
      } else if (user.driver && dto.phone !== undefined) {
        await tx.driver.update({
          where: { id: user.driver.id },
          data: { phone: nextPhone },
        });
      }

      if (user.customer && dto.whatsappOptIn !== undefined && !dto.name?.trim()) {
        await tx.customer.update({
          where: { id: user.customer.id },
          data: {
            whatsappOptIn: dto.whatsappOptIn,
            whatsappOptInAt: dto.whatsappOptIn ? new Date() : null,
          },
        });
      }

      if (nextAddressList !== null && user.customer) {
        await tx.customer.update({
          where: { id: user.customer.id },
          data: { addressList: nextAddressList },
        });
      }
    });

    const refreshed = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        customer: true,
        driver: true,
        shopUsers: { include: { shop: true }, take: 1 },
      },
    });

    return {
      ...this.tokenResponse(
        refreshed.id,
        refreshed.email,
        refreshed.role,
        refreshed.avatarUrl,
      ),
      ...(await this.staffAccess(refreshed.id, refreshed.role)),
      profile: this.profileResponse(refreshed),
    };
  }

  private normalizeAvatarUrl(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;
    if (value.startsWith('data:image/')) {
      if (value.length > 700_000) {
        throw new BadRequestException(
          'That image is too large. Please use a photo under 350KB.',
        );
      }
      return value;
    }
    if (/^https?:\/\//i.test(value)) {
      if (value.length > 2048) {
        throw new BadRequestException(
          'That image link is too long. Please use a shorter URL.',
        );
      }
      return value;
    }
    throw new BadRequestException(
      'Please upload an image file or paste a valid image link.',
    );
  }

  private normalizeEircode(raw: string): string {
    const compact = raw.replace(/\s+/g, '').toUpperCase();
    if (compact.length !== 7) return compact;
    return `${compact.slice(0, 3)} ${compact.slice(3)}`;
  }

  private normalizeAddressList(
    raw: Array<{
      id: string;
      line1: string;
      eircode: string;
      area_name: string;
      label: string;
      isDefault?: boolean;
    }>,
  ) {
    const seen = new Set<string>();
    const list = raw.map((a) => {
      const id = a.id.trim();
      if (!id || seen.has(id)) {
        throw new BadRequestException('Each address needs a unique id');
      }
      seen.add(id);
      return {
        id,
        label: a.label.trim(),
        line1: a.line1.trim(),
        eircode: this.normalizeEircode(a.eircode),
        area_name: a.area_name.trim(),
        isDefault: Boolean(a.isDefault),
      };
    });

    const defaultCount = list.filter((a) => a.isDefault).length;
    if (defaultCount > 1) {
      throw new BadRequestException('Only one default address is allowed');
    }
    if (list.length > 0 && defaultCount === 0) {
      list[0]!.isDefault = true;
    }
    return list;
  }

  private readAddressList(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const a = entry as Record<string, unknown>;
        const id = typeof a.id === 'string' ? a.id : '';
        const line1 = typeof a.line1 === 'string' ? a.line1 : '';
        const eircode = typeof a.eircode === 'string' ? a.eircode : '';
        const area_name =
          typeof a.area_name === 'string'
            ? a.area_name
            : typeof a.areaName === 'string'
              ? a.areaName
              : '';
        const label = typeof a.label === 'string' ? a.label : '';
        if (!id || !line1 || !area_name || !eircode || !label) return null;
        return {
          id,
          label,
          line1,
          eircode: this.normalizeEircode(eircode),
          area_name,
          isDefault: Boolean(a.isDefault),
        };
      })
      .filter((a): a is NonNullable<typeof a> => a != null);
  }

  private profileResponse(user: {
    id: string;
    email: string;
    phone: string | null;
    avatarUrl?: string | null;
    role: UserRole;
    customer: {
      name: string;
      addressList?: unknown;
      whatsappOptIn?: boolean;
    } | null;
    driver: { name: string; phone: string | null } | null;
    shopUsers: Array<{ shop: { name: string } }>;
  }) {
    const name =
      user.customer?.name ??
      user.driver?.name ??
      user.shopUsers[0]?.shop.name ??
      null;
    return {
      id: user.id,
      email: user.email,
      phone: user.phone ?? user.driver?.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      name,
      canEditName: Boolean(user.customer || user.driver),
      addressList: user.customer
        ? this.readAddressList(user.customer.addressList)
        : undefined,
      whatsappOptIn: user.customer
        ? Boolean(user.customer.whatsappOptIn)
        : undefined,
    };
  }

  private async staffAccess(userId: string, role: UserRole) {
    if (role === UserRole.super_admin) {
      const all = await this.prisma.permission.findMany({
        select: { key: true },
        orderBy: { key: 'asc' },
      });
      const staffRole = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          staffRole: { select: { id: true, name: true, slug: true } },
        },
      });
      return {
        staffRole: staffRole?.staffRole ?? {
          id: '00000000-0000-4000-8000-0000000000a1',
          name: 'Super admin',
          slug: 'super-admin',
        },
        permissions: all.map((p) => p.key),
      };
    }

    if (role !== UserRole.admin) {
      return { staffRole: null, permissions: [] as string[] };
    }

    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        staffRole: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });
    if (!row?.staffRole?.isActive) {
      return { staffRole: null, permissions: [] as string[] };
    }
    return {
      staffRole: {
        id: row.staffRole.id,
        name: row.staffRole.name,
        slug: row.staffRole.slug,
      },
      permissions: row.staffRole.permissions
        .map((p) => p.permission.key)
        .sort(),
    };
  }

  private tokenResponse(
    userId: string,
    email: string,
    role: UserRole,
    avatarUrl?: string | null,
  ) {
    const accessToken = this.jwt.sign({
      sub: userId,
      email,
      role,
    });
    return {
      accessToken,
      user: {
        id: userId,
        email,
        role,
        avatarUrl: avatarUrl ?? null,
      },
    };
  }

  /** Issue a normal access token for an existing user (WhatsApp assist deep link). */
  async issueSessionForUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        avatarUrl: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account unavailable');
    }
    return this.tokenResponse(
      user.id,
      user.email,
      user.role,
      user.avatarUrl,
    );
  }
}
