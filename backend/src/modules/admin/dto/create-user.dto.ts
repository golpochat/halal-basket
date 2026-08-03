import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  shopId?: string;

  /** Required when role is admin (staff role assignment). */
  @ValidateIf((o: CreateAdminUserDto) => o.role === UserRole.admin)
  @IsUUID()
  staffRoleId?: string;
}

export class UpdateAdminUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID()
  shopId?: string;

  @IsOptional()
  @IsUUID()
  staffRoleId?: string | null;
}

export class SetUserActiveDto {
  @IsBoolean()
  isActive!: boolean;
}
