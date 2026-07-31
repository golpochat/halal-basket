import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { FulfillmentMode } from '@prisma/client';

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsEnum(FulfillmentMode)
  fulfillmentMode!: FulfillmentMode;

  @IsOptional()
  @IsUUID()
  preferredShopId?: string;

  @IsOptional()
  @IsString()
  deliveryAreaName?: string;

  @IsOptional()
  @IsObject()
  deliveryAddress?: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
