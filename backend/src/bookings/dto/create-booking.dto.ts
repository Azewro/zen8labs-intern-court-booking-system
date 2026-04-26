import { IsNotEmpty, IsString, IsDateString } from 'class-validator';
import { IsAfter } from '../../common/decorators/is-after.decorator';
import { IsValidSlot } from '../../common/decorators/is-valid-slot.decorator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  courtId: string;

  @IsNotEmpty()
  @IsDateString()
  @IsValidSlot()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  @IsValidSlot()
  @IsAfter('startTime')
  endTime: string;
}
