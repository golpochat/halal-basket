import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CreateLegalDocumentDto, UpdateLegalDocumentDto } from './dto/legal.dto';
import { LegalService } from './legal.service';

const OPS = [UserRole.admin, UserRole.super_admin] as const;
const STAFF_GUARDS = [JwtAuthGuard, RolesGuard, PermissionsGuard] as const;

@Controller()
export class LegalController {
  constructor(private readonly legal: LegalService) {}

  @Get('platform/legal')
  listPublic() {
    return this.legal.listPublicFooter();
  }

  @Get('platform/legal/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.legal.getPublicBySlug(slug);
  }

  @Get('admin/legal')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('legal.read')
  listAdmin() {
    return this.legal.listAdmin();
  }

  @Get('admin/legal/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('legal.read')
  getAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.legal.getAdmin(id);
  }

  @Post('admin/legal')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('legal.write')
  create(@Body() dto: CreateLegalDocumentDto) {
    return this.legal.create(dto);
  }

  @Patch('admin/legal/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('legal.write')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLegalDocumentDto,
  ) {
    return this.legal.update(id, dto);
  }

  @Post('admin/legal/:id/publish')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('legal.write')
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.legal.publish(id);
  }

  @Delete('admin/legal/:id')
  @UseGuards(...STAFF_GUARDS)
  @Roles(...OPS)
  @RequirePermissions('legal.write')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.legal.remove(id);
  }
}
