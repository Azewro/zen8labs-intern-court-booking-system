import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { VouchersService } from './vouchers.service';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('vouchers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.vouchersService.create(createVoucherDto);
  }

  @Get()
  findAll() {
    return this.vouchersService.findAll();
  }

  @Patch(':id/toggle')
  toggleStatus(@Param('id') id: string) {
    return this.vouchersService.toggleStatus(id);
  }
}
