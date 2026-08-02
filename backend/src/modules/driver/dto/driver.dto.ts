import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { FulfillmentStatus } from '@prisma/client';

export class DriverUpdateStatusDto {
  @IsEnum(FulfillmentStatus)
  status!: FulfillmentStatus;

  /** Required when status is failed_attempt. */
  @ValidateIf((o: DriverUpdateStatusDto) => o.status === 'failed_attempt')
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one reason for the failed attempt' })
  @ArrayUnique()
  @IsString({ each: true })
  reasons?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
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
