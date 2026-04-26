import { Controller, Post, Body, ValidationPipe, Get, UseGuards, Req, Res, Patch } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body(new ValidationPipe()) dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body(new ValidationPipe()) dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req: any) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@Req() req: any, @Body() body: { fullName?: string; phoneNumber?: string }) {
    return this.authService.updateProfile(req.user.id, body);
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: any) {
    const data = await this.authService.googleLogin(req);
    // Chuyển hướng người dùng về Frontend kèm theo Token trên URL
    return res.redirect(`http://localhost:3000/login?token=${data.access_token}&role=${data.role}`);
  }

  @Patch('change-password')
  @UseGuards(AuthGuard('jwt'))
  changePassword(@Req() req: any, @Body() body: any) {
    return this.authService.changePassword(req.user.id, body);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }
}
