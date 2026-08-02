import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const ADDRESS_LABELS = ['Home', 'Work', 'Family', 'Other'] as const;

/** Irish Eircode — space optional (A65 F4E2). */
const EIRCODE_PATTERN =
  /^[AC-FHKNPRTV-Y][0-9]{2}\s?[0-9AC-FHKNPRTV-Y]{4}$/i;

export class CustomerAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsString()
  @IsIn([...ADDRESS_LABELS])
  label!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  line1!: string;

  @IsString()
  @Matches(EIRCODE_PATTERN, {
    message: 'Eircode must be a valid Irish Eircode (e.g. A65 F4E2)',
  })
  eircode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  area_name!: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
