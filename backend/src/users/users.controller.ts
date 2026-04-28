import { Controller, Get, Patch, Param, Query, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users?page=1&limit=10&search=...&role=USER&sortBy=createdAt&sortOrder=desc
  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.usersService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 10,
      search,
      role,
      sortBy,
      sortOrder,
    });
  }

  // PATCH /users/:id/toggle-status
  @Patch(':id/toggle-status')
  toggleStatus(@Param('id') id: string, @Req() req: any) {
    return this.usersService.toggleStatus(id, req.user.id);
  }
}
