import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import {
  CurrentUser,
  type JwtPayloadUser,
} from '../../common/decorators/current-user.decorator';
import { CreateRoleDto, UpdateRoleDto } from './dto/rbac.dto';
import { RbacService } from './rbac.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('auth/permissions')
  @Roles(
    UserRole.admin,
    UserRole.super_admin,
    UserRole.shop,
    UserRole.driver,
    UserRole.customer,
  )
  myPermissions(@CurrentUser() user: JwtPayloadUser) {
    return this.rbac.permissionsForUser(user.userId);
  }

  @Get('admin/rbac/permissions')
  @Roles(UserRole.super_admin, UserRole.admin)
  @RequirePermissions('roles.read')
  listPermissions() {
    return this.rbac.listPermissions();
  }

  @Get('admin/rbac/roles')
  @Roles(UserRole.super_admin, UserRole.admin)
  @RequirePermissions('roles.read')
  listRoles() {
    return this.rbac.listRoles();
  }

  @Post('admin/rbac/roles')
  @Roles(UserRole.super_admin)
  @RequirePermissions('roles.write')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbac.createRole(dto);
  }

  @Patch('admin/rbac/roles/:id')
  @Roles(UserRole.super_admin)
  @RequirePermissions('roles.write')
  updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rbac.updateRole(id, dto);
  }

  @Delete('admin/rbac/roles/:id')
  @Roles(UserRole.super_admin)
  @RequirePermissions('roles.write')
  deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rbac.deleteRole(id);
  }

  /** Convenience: replace permission set */
  @Put('admin/rbac/roles/:id/permissions')
  @Roles(UserRole.super_admin)
  @RequirePermissions('roles.write')
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { permissionKeys: string[] },
  ) {
    return this.rbac.updateRole(id, {
      permissionKeys: body.permissionKeys ?? [],
    });
  }
}
