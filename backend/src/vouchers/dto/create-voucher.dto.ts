import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsDateString } from 'class-validator';

export class CreateVoucherDto {
  @IsString()
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  code: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  discountPercent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @IsDateString({}, { message: 'Ngày hết hạn không hợp lệ' })
  validTo: string;
}
