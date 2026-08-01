import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { FulfillmentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateFulfillmentStatusDto {
  @IsEnum(FulfillmentStatus)
  status!: FulfillmentStatus;
}

export class UpdateShopProductDto {
  @IsOptional()
  @IsNumber()
  price?: number;

  @ValidateIf((_, v) => v !== null)
  @IsOptional()
  @IsNumber()
  discountPrice?: number | null;

  @IsOptional()
  @IsBoolean()
  isInStock?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class AssignDriverDto {
  @IsUUID()
  driverId!: string;
}
