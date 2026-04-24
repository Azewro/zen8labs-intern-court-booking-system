import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Kiểm tra email đã tồn tại chưa
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new HttpException('Email đã được sử dụng', HttpStatus.BAD_REQUEST);
    }

    // 2. Hash mật khẩu (Bcrypt)
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 3. Lưu vào Database
    const newUser = await this.usersService.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.full_name,
    });

    // 4. Xóa pass trước khi trả về
    const { password, ...result } = newUser;
    return result;
  }

  async login(dto: LoginDto) {
    // 1. Tìm user
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new HttpException('Sai email hoặc mật khẩu', HttpStatus.UNAUTHORIZED);
    }

    // 2. So sánh mật khẩu
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new HttpException('Sai email hoặc mật khẩu', HttpStatus.UNAUTHORIZED);
    }

    // 3. Cấp Token JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateGoogleUser(details: any) {
    let user = await this.usersService.findByEmail(details.email);
    if (!user) {
      user = await this.usersService.create({
        email: details.email,
        fullName: `${details.firstName} ${details.lastName}`,
        googleId: details.googleId,
        password: null, // Login bằng Google không cần pass
      });
    }
    return user;
  }

  async googleLogin(req: any) {
    if (!req.user) {
      throw new HttpException('No user from google', HttpStatus.UNAUTHORIZED);
    }
    const payload = { sub: req.user.id, email: req.user.email, role: req.user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
