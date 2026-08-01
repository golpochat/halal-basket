import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class FeaturedCategoryItemDto {
  @IsString()
  categoryId!: string;

  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsBoolean()
  isActive!: boolean;
}

export class ReplaceFeaturedCategoriesDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => FeaturedCategoryItemDto)
  items!: FeaturedCategoryItemDto[];
}
