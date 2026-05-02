import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateCourtDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên sân không được để trống' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Vị trí không được để trống' })
  location: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsNumber()
  @Min(0, { message: 'Giá tiền phải lớn hơn hoặc bằng 0' })
  pricePerHour: number;

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
