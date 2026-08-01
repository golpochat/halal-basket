import { Body, Controller, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ReplaceFeaturedCategoriesDto } from './dto/featured-categories.dto';
import { FeaturedCategoriesService } from './featured-categories.service';

const PLATFORM = [UserRole.super_admin] as const;

@Controller()
export class FeaturedCategoriesController {
  constructor(private readonly featured: FeaturedCategoriesService) {}

  @Get('platform/featured-categories')
  getPublic() {
    return this.featured.getPublic();
  }

  @Get('admin/featured-categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  listAdmin() {
    return this.featured.listAdmin();
  }

  @Put('admin/featured-categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  replaceAll(@Body() dto: ReplaceFeaturedCategoriesDto) {
    return this.featured.replaceAll(dto);
  }

  @Patch('admin/featured-categories/:categoryId/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...PLATFORM)
  setActive(
    @Param('categoryId') categoryId: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.featured.setActive(categoryId, Boolean(body.isActive));
  }
}
