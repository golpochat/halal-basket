import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Weekday } from '@prisma/client';

export class CreateCalendarEntryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  areaName!: string;

  @IsEnum(Weekday)
  deliveryDay!: Weekday;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCalendarEntryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  areaName?: string;

  @IsOptional()
  @IsEnum(Weekday)
  deliveryDay?: Weekday;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SetCalendarActiveDto {
  @IsBoolean()
  isActive!: boolean;
}
