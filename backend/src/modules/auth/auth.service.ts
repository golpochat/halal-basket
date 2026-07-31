import {
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

    return this.tokenResponse(user.id, user.email, user.role);
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

    return this.tokenResponse(user.id, user.email, user.role);
  }

  private tokenResponse(userId: string, email: string, role: UserRole) {
    const accessToken = this.jwt.sign({
      sub: userId,
      email,
      role,
    });
    return {
      accessToken,
      user: { id: userId, email, role },
    };
  }
}
