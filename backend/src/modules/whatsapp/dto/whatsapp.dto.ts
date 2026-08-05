import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DevInboundDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  providerMessageId?: string;
}

export class ReplyThreadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class DevCommerceItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class DevCommerceOrderDto {
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  phone!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DevCommerceItemDto)
  items!: DevCommerceItemDto[];

  @IsOptional()
  @IsString()
  catalogId?: string;
}
