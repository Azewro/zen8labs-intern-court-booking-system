import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  // Tiêu chí 3: Tạo sân (Chỉ ADMIN)
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  create(@Body() createCourtDto: CreateCourtDto) {
    return this.courtsService.create(createCourtDto);
  }

  // Tiêu chí 6: Xem danh sách sân (Ai cũng xem được, không gắn Guard)
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('deleted') deleted?: string,
  ) {
    return this.courtsService.findAll(page ? +page : 1, limit ? +limit : 10, search, deleted === 'true');
  }

  // Tiêu chí 6 (Phụ): Lấy chi tiết 1 sân
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  // Tiêu chí 4: Sửa thông tin sân (Chỉ ADMIN)
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateCourtDto: UpdateCourtDto) {
    return this.courtsService.update(id, updateCourtDto);
  }

  // Tiêu chí 5: Xóa sân bằng cơ chế Soft Delete (Chỉ ADMIN)
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.courtsService.softDelete(id);
  }

  // API Lấy danh sách booking bị ảnh hưởng nếu xóa sân
  @Get(':id/affected-bookings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  getAffectedBookings(@Param('id') id: string) {
    return this.courtsService.getAffectedBookings(id);
  }

  // API Khôi phục sân
  @Patch(':id/restore')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  restore(@Param('id') id: string) {
    return this.courtsService.restore(id);
  }
}
