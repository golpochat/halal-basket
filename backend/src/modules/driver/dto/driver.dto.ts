import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { FulfillmentStatus } from '@prisma/client';

export class DriverUpdateStatusDto {
  @IsEnum(FulfillmentStatus)
  status!: FulfillmentStatus;
}

export class DriverFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  suggestBlock?: boolean;
}
