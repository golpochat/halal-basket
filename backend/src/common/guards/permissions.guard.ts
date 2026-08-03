import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { JwtPayloadUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayloadUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Insufficient permissions');

    if (user.role === UserRole.super_admin) return true;

    const keys = await this.loadPermissionKeys(user.userId);
    const missing = required.filter((k) => !keys.has(k));
    if (missing.length > 0) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }

  private async loadPermissionKeys(userId: string): Promise<Set<string>> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        staffRole: {
          select: {
            isActive: true,
            permissions: {
              select: { permission: { select: { key: true } } },
            },
          },
        },
      },
    });
    if (!row?.staffRole?.isActive) return new Set();
    return new Set(
      row.staffRole.permissions.map((p) => p.permission.key),
    );
  }
}
