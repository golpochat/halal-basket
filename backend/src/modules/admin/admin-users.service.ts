import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAdminUserDto,
  UpdateAdminUserDto,
} from './dto/create-user.dto';
import {
  SYSTEM_ROLE_ADMIN,
  SYSTEM_ROLE_SUPER_ADMIN,
} from '../rbac/permission-catalog';

const STAFF_ROLES: UserRole[] = [
  UserRole.super_admin,
  UserRole.admin,
  UserRole.shop,
  UserRole.driver,
];

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        staffRole: { select: { id: true, name: true, slug: true } },
        driver: { select: { name: true, isActive: true } },
        shopUsers: {
          select: {
            shop: { select: { id: true, name: true } },
          },
          take: 1,
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      name: u.driver?.name ?? u.shopUsers[0]?.shop?.name ?? null,
      shop: u.shopUsers[0]?.shop ?? null,
      staffRole: u.staffRole,
    }));
  }

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
    if (dto.role === UserRole.driver && !dto.name?.trim()) {
      throw new BadRequestException('name is required for driver users');
    }

    const staffRoleId = await this.resolveStaffRoleId(dto.role, dto.staffRoleId);

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          phone: dto.phone,
          passwordHash,
          role: dto.role,
          staffRoleId,
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
            name: dto.name!.trim(),
            phone: dto.phone,
          },
        });
      }
    });

    return this.listUsers();
  }

  async updateUser(id: string, dto: UpdateAdminUserDto) {
    const user = await this.requireStaffUser(id);

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const clash = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (clash) throw new ConflictException('Email already registered');
    }

    if (user.role === UserRole.shop && dto.shopId) {
      const shop = await this.prisma.shop.findUnique({
        where: { id: dto.shopId },
      });
      if (!shop) throw new BadRequestException('Shop not found');
    }

    if (
      (user.role === UserRole.driver || user.role === UserRole.shop) &&
      dto.name !== undefined &&
      !dto.name.trim()
    ) {
      throw new BadRequestException('name cannot be empty');
    }

    let staffRoleId: string | null | undefined = undefined;
    if (dto.staffRoleId !== undefined) {
      if (user.role !== UserRole.admin && user.role !== UserRole.super_admin) {
        throw new BadRequestException(
          'Staff roles can only be assigned to admin users',
        );
      }
      if (user.role === UserRole.super_admin) {
        staffRoleId = SYSTEM_ROLE_SUPER_ADMIN.id;
      } else if (dto.staffRoleId === null) {
        throw new BadRequestException('Admin users require a staff role');
      } else {
        staffRoleId = await this.resolveStaffRoleId(
          UserRole.admin,
          dto.staffRoleId,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
          ...(dto.password
            ? { passwordHash: await bcrypt.hash(dto.password, 12) }
            : {}),
          ...(staffRoleId !== undefined ? { staffRoleId } : {}),
        },
      });

      if (user.role === UserRole.driver && dto.name !== undefined) {
        await tx.driver.update({
          where: { userId: id },
          data: { name: dto.name.trim() },
        });
      }

      if (user.role === UserRole.shop) {
        const link = await tx.shopUser.findFirst({ where: { userId: id } });
        const nextShopId = dto.shopId ?? link?.shopId;
        if (dto.shopId) {
          if (link) {
            await tx.shopUser.update({
              where: { id: link.id },
              data: { shopId: dto.shopId },
            });
          } else {
            await tx.shopUser.create({
              data: { userId: id, shopId: dto.shopId },
            });
          }
        }
        if (dto.name !== undefined && nextShopId) {
          await tx.shop.update({
            where: { id: nextShopId },
            data: { name: dto.name.trim() },
          });
        }
      }
    });

    return this.listUsers();
  }

  async setActive(id: string, isActive: boolean, actorUserId: string) {
    const user = await this.requireStaffUser(id);
    if (!isActive && id === actorUserId) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    if (!isActive && user.role === UserRole.super_admin) {
      const activeSupers = await this.prisma.user.count({
        where: {
          role: UserRole.super_admin,
          isActive: true,
          NOT: { id },
        },
      });
      if (activeSupers === 0) {
        throw new BadRequestException(
          'Cannot deactivate the last active super admin',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { isActive } });
      if (user.role === UserRole.driver) {
        await tx.driver.updateMany({
          where: { userId: id },
          data: { isActive },
        });
      }
    });

    return this.listUsers();
  }

  async deleteUser(id: string, actorUserId: string) {
    const user = await this.requireStaffUser(id);
    if (id === actorUserId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    if (user.role === UserRole.super_admin) {
      const supers = await this.prisma.user.count({
        where: { role: UserRole.super_admin, NOT: { id } },
      });
      if (supers === 0) {
        throw new BadRequestException('Cannot delete the last super admin');
      }
    }

    await this.prisma.user.delete({ where: { id } });
    return this.listUsers();
  }

  private async resolveStaffRoleId(
    portalRole: UserRole,
    staffRoleId?: string | null,
  ): Promise<string | null> {
    if (portalRole === UserRole.super_admin) {
      return SYSTEM_ROLE_SUPER_ADMIN.id;
    }
    if (portalRole !== UserRole.admin) {
      return null;
    }
    const id = staffRoleId?.trim() || SYSTEM_ROLE_ADMIN.id;
    const role = await this.prisma.role.findFirst({
      where: { id, isActive: true },
    });
    if (!role) throw new BadRequestException('Staff role not found');
    if (role.slug === SYSTEM_ROLE_SUPER_ADMIN.slug) {
      throw new BadRequestException(
        'Cannot assign Super admin staff role to an admin user',
      );
    }
    return role.id;
  }

  private async requireStaffUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: { in: STAFF_ROLES } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
