import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

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
