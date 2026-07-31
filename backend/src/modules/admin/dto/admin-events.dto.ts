import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class RefundDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class ComplaintDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class RecalcRiskDto {
  @IsUUID()
  customerId!: string;
}
