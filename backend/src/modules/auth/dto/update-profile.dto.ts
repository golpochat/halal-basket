import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CustomerAddressDto } from './customer-address.dto';

export class UpdateProfileDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  /** Optional profile image URL or small data-URL. Empty string clears. */
  @IsOptional()
  @IsString()
  @MaxLength(700_000)
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  newPassword?: string;

  /** Customer: transactional WhatsApp order updates. */
  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean;

  /** Customer saved addresses. Omit to leave unchanged; send [] to clear. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  addressList?: CustomerAddressDto[];
}
