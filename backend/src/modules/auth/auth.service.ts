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

    return this.tokenResponse(user.id, user.email, user.role, user.avatarUrl);
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
    return this.profileResponse(user);
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

    if (dto.phone && dto.phone !== user.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: dto.phone, NOT: { id: user.id } },
      });
      if (taken) throw new ConflictException('Phone already in use');
    }

    const nextEmail = dto.email?.toLowerCase() ?? user.email;
    const nextPhone =
      dto.phone === undefined ? user.phone : dto.phone.trim() || null;
    const nextAvatar =
      dto.avatarUrl === undefined
        ? undefined
        : this.normalizeAvatarUrl(dto.avatarUrl);

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
            data: { name: dto.name.trim() },
          });
        }
        if (user.driver) {
          await tx.driver.update({
            where: { id: user.driver.id },
            data: {
              name: dto.name.trim(),
              ...(dto.phone !== undefined
                ? { phone: dto.phone.trim() || null }
                : {}),
            },
          });
        }
      } else if (user.driver && dto.phone !== undefined) {
        await tx.driver.update({
          where: { id: user.driver.id },
          data: { phone: dto.phone.trim() || null },
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
      profile: this.profileResponse(refreshed),
    };
  }

  private normalizeAvatarUrl(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;
    if (value.startsWith('data:image/')) {
      if (value.length > 700_000) {
        throw new BadRequestException('Profile image is too large');
      }
      return value;
    }
    if (/^https?:\/\//i.test(value)) {
      if (value.length > 2048) {
        throw new BadRequestException('Profile image URL is too long');
      }
      return value;
    }
    throw new BadRequestException(
      'Avatar must be an http(s) URL or image data URL',
    );
  }

  private profileResponse(user: {
    id: string;
    email: string;
    phone: string | null;
    avatarUrl?: string | null;
    role: UserRole;
    customer: { name: string } | null;
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
}
