import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_SUPER_ADMIN,
  SYSTEM_STAFF_ROLES,
} from './permission-catalog';
import { CreateRoleDto, UpdateRoleDto } from './dto/rbac.dto';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  /** Upsert catalog permissions + system roles (safe to run from seed). */
  async syncCatalogAndSystemRoles() {
    for (const p of PERMISSION_CATALOG) {
      await this.prisma.permission.upsert({
        where: { key: p.key },
        create: {
          key: p.key,
          name: p.name,
          description: p.description,
          groupName: p.groupName,
        },
        update: {
          name: p.name,
          description: p.description,
          groupName: p.groupName,
        },
      });
    }

    const allPerms = await this.prisma.permission.findMany({
      select: { id: true, key: true },
    });
    const byKey = new Map(allPerms.map((p) => [p.key, p.id]));
    const allKeys = [...byKey.keys()];

    for (const sys of SYSTEM_STAFF_ROLES) {
      await this.prisma.role.upsert({
        where: { id: sys.id },
        create: {
          id: sys.id,
          name: sys.name,
          slug: sys.slug,
          description: sys.description,
          isSystem: true,
          isActive: true,
        },
        update: {
          name: sys.name,
          description: sys.description,
          isSystem: true,
          isActive: true,
        },
      });
      const keys =
        sys.permissionKeys === 'all' ? allKeys : [...sys.permissionKeys];
      await this.replaceRolePermissions(sys.id, keys, byKey);
    }
  }

  listPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ groupName: 'asc' }, { name: 'asc' }],
    });
  }

  async listRoles() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      isSystem: r.isSystem,
      isActive: r.isActive,
      userCount: r._count.users,
      permissionKeys: r.permissions.map((p) => p.permission.key).sort(),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async createRole(dto: CreateRoleDto) {
    const slug = this.slugify(dto.name);
    const existing = await this.prisma.role.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException('A role with this name already exists');
    }
    const keys = dto.permissionKeys ?? [];
    await this.assertPermissionKeys(keys);

    const role = await this.prisma.role.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        isSystem: false,
        isActive: true,
      },
    });

    if (keys.length > 0) {
      const byKey = await this.permissionIdByKey();
      await this.replaceRolePermissions(role.id, keys, byKey);
    }

    return this.listRoles();
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.requireRole(id);
    if (role.isSystem && dto.name && dto.name.trim() !== role.name) {
      throw new BadRequestException('System role names cannot be renamed');
    }
    if (role.isSystem && dto.isActive === false) {
      throw new BadRequestException('System roles cannot be deactivated');
    }

    if (dto.permissionKeys) {
      await this.assertPermissionKeys(dto.permissionKeys);
      if (role.isSystem && role.slug === SYSTEM_ROLE_SUPER_ADMIN.slug) {
        // Super admin always keeps full catalog
        const byKey = await this.permissionIdByKey();
        await this.replaceRolePermissions(id, [...byKey.keys()], byKey);
      } else {
        const byKey = await this.permissionIdByKey();
        await this.replaceRolePermissions(id, dto.permissionKeys, byKey);
      }
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && !role.isSystem
          ? {
              name: dto.name.trim(),
              slug: this.slugify(dto.name),
            }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.isActive !== undefined && !role.isSystem
          ? { isActive: dto.isActive }
          : {}),
      },
    });

    return this.listRoles();
  }

  async deleteRole(id: string) {
    const role = await this.requireRole(id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    const users = await this.prisma.user.count({ where: { staffRoleId: id } });
    if (users > 0) {
      throw new BadRequestException(
        'Reassign users before deleting this role',
      );
    }
    await this.prisma.role.delete({ where: { id } });
    return this.listRoles();
  }

  async permissionsForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
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
    if (!user) throw new NotFoundException('User not found');

    if (user.role === 'super_admin') {
      const all = await this.prisma.permission.findMany({
        select: { key: true },
      });
      return {
        staffRole: user.staffRole
          ? {
              id: user.staffRole.id,
              name: user.staffRole.name,
              slug: user.staffRole.slug,
            }
          : {
              id: SYSTEM_ROLE_SUPER_ADMIN.id,
              name: SYSTEM_ROLE_SUPER_ADMIN.name,
              slug: SYSTEM_ROLE_SUPER_ADMIN.slug,
            },
        permissions: all.map((p) => p.key).sort(),
      };
    }

    if (!user.staffRole?.isActive) {
      return { staffRole: null, permissions: [] as string[] };
    }

    return {
      staffRole: {
        id: user.staffRole.id,
        name: user.staffRole.name,
        slug: user.staffRole.slug,
      },
      permissions: user.staffRole.permissions
        .map((p) => p.permission.key)
        .sort(),
    };
  }

  private async requireRole(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private async permissionIdByKey() {
    const rows = await this.prisma.permission.findMany({
      select: { id: true, key: true },
    });
    return new Map(rows.map((p) => [p.key, p.id]));
  }

  private async assertPermissionKeys(keys: string[]) {
    const byKey = await this.permissionIdByKey();
    for (const key of keys) {
      if (!byKey.has(key)) {
        throw new BadRequestException(`Unknown permission: ${key}`);
      }
    }
  }

  private async replaceRolePermissions(
    roleId: string,
    keys: string[],
    byKey: Map<string, string>,
  ) {
    const unique = [...new Set(keys)];
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (unique.length === 0) return;
    await this.prisma.rolePermission.createMany({
      data: unique.map((key) => ({
        roleId,
        permissionId: byKey.get(key)!,
      })),
    });
  }

  private slugify(name: string) {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) throw new BadRequestException('Invalid role name');
    return slug;
  }
}
