import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Zen8Labs Court Booking" <${process.env.SMTP_USER}>`,
      to: to,
      subject: 'Yêu cầu khôi phục mật khẩu - Zen8Labs Court Booking',
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f766e; text-align: center;">Khôi phục mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn tại hệ thống đặt sân Zen8Labs.</p>
          <p>Vui lòng click vào nút bên dưới để đặt lại mật khẩu. Link này sẽ <strong>hết hạn sau 30 phút</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">Đổi Mật Khẩu Mới</a>
          </div>
          <p>Nếu nút bấm không hoạt động, bạn có thể copy đường link sau dán vào trình duyệt:</p>
          <p style="background: #f1f5f9; padding: 10px; word-break: break-all; font-size: 14px;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px; text-align: center;">Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error("Lỗi gửi mail: ", error);
      return false;
    }
  }
}
