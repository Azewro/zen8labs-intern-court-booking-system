import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async getMe(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new HttpException('Không tìm thấy người dùng', HttpStatus.NOT_FOUND);
    const { password, ...result } = user;
    return result;
  }

  async updateProfile(userId: string, data: { fullName?: string; phoneNumber?: string }) {
    const updated = await this.usersService.update(userId, data);
    const { password, ...result } = updated;
    return result;
  }

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
    if (!user.password) {
      throw new HttpException('Tài khoản này được đăng ký bằng Google. Vui lòng sử dụng Đăng nhập bằng Google.', HttpStatus.UNAUTHORIZED);
    }
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new HttpException('Sai email hoặc mật khẩu', HttpStatus.UNAUTHORIZED);
    }

    // 3. Cấp Token JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { role: user.role }
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
      role: req.user.role
    };
  }

  async changePassword(userId: string, body: any) {
    const { oldPassword, newPassword } = body;
    const user = await this.usersService.findById(userId);
    
    if (!user?.password) {
      throw new HttpException('Tài khoản liên kết Google không thể đổi mật khẩu', HttpStatus.BAD_REQUEST);
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new HttpException('Mật khẩu cũ không chính xác', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(userId, { password: hashedPassword });
    return { message: 'Đổi mật khẩu thành công' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new HttpException('Email không tồn tại trong hệ thống', HttpStatus.NOT_FOUND);
    }
    if (!user.password) {
      throw new HttpException('Tài khoản này liên kết với Google, không có mật khẩu để khôi phục.', HttpStatus.BAD_REQUEST);
    }

    // Tạo token reset có thời hạn 30p
    const token = this.jwtService.sign(
      { email, purpose: 'reset-password' },
      { expiresIn: '30m' }
    );

    await this.mailService.sendPasswordResetEmail(email, token);

    return { message: 'Vui lòng kiểm tra email của bạn để đặt lại mật khẩu' };
  }

  async resetPassword(body: any) {
    const { token, newPassword } = body;
    let payload;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      throw new HttpException('Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    if (payload.purpose !== 'reset-password') {
      throw new HttpException('Token không hợp lệ', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersService.findByEmail(payload.email);
    if (!user) {
      throw new HttpException('Tài khoản không tồn tại', HttpStatus.NOT_FOUND);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.update(user.id, { password: hashedPassword });
    return { message: 'Đặt lại mật khẩu thành công' };
  }
}
