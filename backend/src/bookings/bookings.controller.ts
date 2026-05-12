import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // API dành cho Admin xem toàn bộ danh sách đặt sân (Có Pagination, Search)
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('filterDate') filterDate?: string,
    @Query('filterStartTime') filterStartTime?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.bookingsService.findAllForAdmin({
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      search,
      status,
      filterDate,
      filterStartTime,
      sortBy,
      sortOrder,
    });
  }

  // Tiêu chí 7: Xem lịch trống của sân (Public, truyền date để tra cứu)
  @Get('court/:courtId')
  getCourtSchedule(
    @Param('courtId') courtId: string,
    @Query('date') date: string,
  ) {
    // Nếu không truyền date, lấy ngày hôm nay
    if (!date) date = new Date().toISOString().split('T')[0];
    return this.bookingsService.getCourtSchedule(courtId, date);
  }

  // Tiêu chí 8: Khách hàng Đặt sân
  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(@Req() req: any, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(req.user.id, createBookingDto);
  }

  // Tiêu chí 11: Tính tiền trước khi đặt (Preview)
  @Post('calculate')
  @UseGuards(AuthGuard('jwt'))
  calculatePrice(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.calculatePrice(createBookingDto);
  }

  // Tiêu chí 10: Xem lịch sử của bản thân (Tự check id trong token)
  @Get('my-bookings')
  @UseGuards(AuthGuard('jwt'))
  getMyBookings(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.bookingsService.getMyBookings(req.user.id, {
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      status,
    });
  }

  // Tiêu chí 9: Hủy sân (Chỉ user của booking đó mới hủy được)
  @Patch(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  cancel(@Req() req: any, @Param('id') bookingId: string) {
    return this.bookingsService.cancel(req.user.id, bookingId);
  }

  // Khách hàng bấm thanh toán lại
  @Post(':id/pay-again')
  @UseGuards(AuthGuard('jwt'))
  payAgain(@Req() req: any, @Param('id') bookingId: string) {
    return this.bookingsService.payAgain(req.user.id, bookingId);
  }

  // Admin: Duyệt phiếu đặt sân
  @Patch(':id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  approveBooking(@Param('id') bookingId: string) {
    return this.bookingsService.updateBookingStatus(bookingId, 'CONFIRMED');
  }

  // Admin: Từ chối phiếu đặt sân
  @Patch(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  rejectBooking(@Param('id') bookingId: string) {
    return this.bookingsService.updateBookingStatus(bookingId, 'CANCELLED');
  }
}
