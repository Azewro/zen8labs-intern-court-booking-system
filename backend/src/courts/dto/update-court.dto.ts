import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peakPricePerHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peakStartHour?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  peakEndHour?: number;
}
