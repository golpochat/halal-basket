import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAdminUserDto } from './dto/create-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(dto: CreateAdminUserDto, actorRole: UserRole) {
    if (dto.role === UserRole.customer) {
      throw new BadRequestException(
        'Use POST /auth/register-customer for customers',
      );
    }
    if (
      (dto.role === UserRole.admin || dto.role === UserRole.super_admin) &&
      actorRole !== UserRole.super_admin
    ) {
      throw new BadRequestException(
        'Only super_admin can create admin or super_admin users',
      );
    }
    if (dto.role === UserRole.shop && !dto.shopId) {
      throw new BadRequestException('shopId is required for shop users');
    }
    if ((dto.role === UserRole.shop || dto.role === UserRole.driver) && !dto.name) {
      throw new BadRequestException('name is required for shop/driver users');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          passwordHash,
          role: dto.role,
          isActive: true,
        },
      });

      if (dto.role === UserRole.shop && dto.shopId) {
        await tx.shopUser.create({
          data: { userId: user.id, shopId: dto.shopId },
        });
      }

      if (dto.role === UserRole.driver) {
        await tx.driver.create({
          data: {
            userId: user.id,
            name: dto.name!,
            phone: dto.phone,
          },
        });
      }

      return {
        id: user.id,
        email: user.email,
        role: user.role,
      };
    });
  }
}
