import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
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
  @IsBoolean()
  isVisible?: boolean;
}

export class AssignDriverDto {
  @IsUUID()
  driverId!: string;
}
