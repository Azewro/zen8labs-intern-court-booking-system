import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CourtsService } from './courts.service';
import { CreateCourtDto } from './dto/create-court.dto';
import { UpdateCourtDto } from './dto/update-court.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  create(@Body() createCourtDto: CreateCourtDto) {
    return this.courtsService.create(createCourtDto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.courtsService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      search,
      includeInactive === 'true',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.courtsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() updateCourtDto: UpdateCourtDto) {
    return this.courtsService.update(id, updateCourtDto);
  }

  // Lấy chi tiết booking bị ảnh hưởng (phân loại URGENT/VIP/NORMAL)
  @Get(':id/affected-bookings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  getAffectedBookings(@Param('id') id: string) {
    return this.courtsService.getAffectedBookingsDetail(id);
  }

  // Tạm ngừng sân (không cho đặt mới, giữ booking cũ)
  @Patch(':id/suspend')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  suspend(@Param('id') id: string) {
    return this.courtsService.suspend(id);
  }

  // Kích hoạt lại sân từ SUSPENDED về ACTIVE
  @Patch(':id/activate')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  activate(@Param('id') id: string) {
    return this.courtsService.activate(id);
  }

  // Đóng sân vĩnh viễn (cancel bookings + gửi mail)
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  close(@Param('id') id: string) {
    return this.courtsService.close(id);
  }

  // Restore (giữ tương thích cũ)
  @Patch(':id/restore')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  restore(@Param('id') id: string) {
    return this.courtsService.restore(id);
  }
}
