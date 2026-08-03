import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateCurrencyDto {
  @IsString()
  @MinLength(3)
  @MaxLength(8)
  @Matches(/^[A-Za-z]{3,8}$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  symbol!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  exchangeRate?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}

export class UpdateCurrencyDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(8)
  @Matches(/^[A-Za-z]{3,8}$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(8)
  symbol?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  exchangeRate?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}

export class PublishDto {
  @IsBoolean()
  isPublished!: boolean;
}

export class CreateLanguageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  @Matches(/^[a-z]{2,3}(-[A-Za-z0-9]+)?$/)
  code!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nativeName!: string;

  @IsOptional()
  @IsBoolean()
  isRtl?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}

export class UpdateLanguageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(16)
  @Matches(/^[a-z]{2,3}(-[A-Za-z0-9]+)?$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  nativeName?: string;

  @IsOptional()
  @IsBoolean()
  isRtl?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}

export class UpdateDeliveryFeesDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  scheduledDeliveryFee!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pickupFee!: number;

  /** 0 = disabled. Free scheduled delivery when item subtotal >= this. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  freeDeliveryOverAmount?: number;

  /** Per-area scheduled fees; missing areas use scheduledDeliveryFee. */
  @IsOptional()
  @IsObject()
  feesByArea?: Record<string, number>;
}

export class CouponRuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  code!: string;

  @IsString()
  @Matches(/^(percent|fixed)$/)
  type!: 'percent' | 'fixed';

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  /** ISO-8601 start; omit/null = no start bound. */
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? null : value,
  )
  @ValidateIf((_, v) => v != null)
  @IsDateString()
  startsAt?: string | null;

  /** ISO-8601 end; omit/null = no end bound. */
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? null : value,
  )
  @ValidateIf((_, v) => v != null)
  @IsDateString()
  endsAt?: string | null;

  /** Total redemptions across all customers; omit/null = unlimited. */
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? null : value,
  )
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxLimit?: number | null;

  /** Redemptions per customer; omit/null = unlimited. */
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === undefined ? null : value,
  )
  @ValidateIf((_, v) => v != null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxLimitPerUser?: number | null;
}

export class UpdatePromotionsDto {
  @IsOptional()
  @IsBoolean()
  bannerEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  bannerMessage?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouponRuleDto)
  coupons?: CouponRuleDto[];
}

export class ValidateCouponDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subtotal!: number;
}

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  heroBackgroundUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  heroSubtitle?: string;
}

export class CreateBrandingItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  heroBackgroundUrl?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  heroTitle!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  heroSubtitle!: string;

  @IsOptional()
  @IsBoolean()
  setActive?: boolean;
}

export class UpdateBrandingItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  heroBackgroundUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  heroTitle?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  heroSubtitle?: string;
}

export class SetActiveBrandingDto {
  @IsString()
  @MinLength(1)
  activeId!: string;
}

export class CreateWarehouseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliveryZones?: string[];
}

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliveryZones?: string[];
}

/** @deprecated Prefer CreateWarehouseDto / UpdateWarehouseDto */
export class UpsertWarehouseDto extends UpdateWarehouseDto {}

export class PublishWarehouseDto {
  @IsBoolean()
  published!: boolean;
}

export class SetWarehouseActiveDto {
  @IsBoolean()
  isActive!: boolean;
}
