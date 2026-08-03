import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateLegalDocumentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(SLUG_RE, {
    message: 'slug must be lowercase kebab-case (a-z, 0-9, hyphens)',
  })
  slug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string | null;

  @IsString()
  @MinLength(1)
  bodyMarkdown!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  showInFooter?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateLegalDocumentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(SLUG_RE, {
    message: 'slug must be lowercase kebab-case (a-z, 0-9, hyphens)',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subtitle?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  bodyMarkdown?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  showInFooter?: boolean;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
