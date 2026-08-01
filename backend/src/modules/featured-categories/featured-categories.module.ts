import { Module } from '@nestjs/common';
import { FeaturedCategoriesController } from './featured-categories.controller';
import { FeaturedCategoriesService } from './featured-categories.service';

@Module({
  controllers: [FeaturedCategoriesController],
  providers: [FeaturedCategoriesService],
  exports: [FeaturedCategoriesService],
})
export class FeaturedCategoriesModule {}
