import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter.sendMail({
      from: `"Zen8Labs Court Booking" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Yêu cầu khôi phục mật khẩu - Zen8Labs Court Booking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f766e; text-align: center;">Khôi phục mật khẩu</h2>
          <p>Xin chào,</p>
          <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn.</p>
          <p>Link sẽ <strong>hết hạn sau 30 phút</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">Đổi Mật Khẩu Mới</a>
          </div>
          <p style="background: #f1f5f9; padding: 10px; word-break: break-all; font-size: 14px;">${resetLink}</p>
        </div>
      `,
    }).catch(err => console.error('Lỗi gửi mail reset:', err));
  }

  async sendCourtClosedNotification(params: {
    to: string;
    customerName: string;
    courtName: string;
    startTime: Date;
    endTime: Date;
    priority: 'URGENT' | 'VIP' | 'NORMAL';
  }) {
    const { to, customerName, courtName, startTime, endTime, priority } = params;
    const timeStr = `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;
    const dateStr = format(startTime, "EEEE, dd/MM/yyyy", { locale: vi });

    const subjectMap = {
      URGENT: `🚨 [KHẨN] Hủy lịch đặt sân "${courtName}" - Cần xử lý ngay`,
      VIP:    `⭐ Thông báo hủy lịch VIP - Sân "${courtName}"`,
      NORMAL: `Thông báo hủy lịch đặt sân "${courtName}"`,
    };

    const badgeMap = {
      URGENT: `<span style="background:#ef4444;color:white;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:bold;">🚨 KHẨN - Sắp đến giờ đá</span>`,
      VIP:    `<span style="background:#f59e0b;color:white;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:bold;">⭐ Khách VIP</span>`,
      NORMAL: `<span style="background:#64748b;color:white;padding:3px 10px;border-radius:20px;font-size:13px;font-weight:bold;">Thông thường</span>`,
    };

    const noteMap = {
      URGENT: `<p style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px;color:#991b1b;"><strong>⚠️ Lưu ý:</strong> Lịch này sắp đến giờ, đội ngũ chăm sóc khách hàng vui lòng liên hệ trực tiếp để hỗ trợ kịp thời.</p>`,
      VIP:    `<p style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;color:#92400e;"><strong>⭐ Khách VIP:</strong> Vui lòng ưu tiên sắp xếp sân thay thế hoặc liên hệ trao đổi phương án bù lịch.</p>`,
      NORMAL: ``,
    };

    await this.transporter.sendMail({
      from: `"Zen8Labs Court Booking" <${process.env.SMTP_USER}>`,
      to,
      subject: subjectMap[priority],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #dc2626; text-align: center;">⛔ Thông báo hủy lịch đặt sân</h2>
          <div style="text-align:center;margin-bottom:16px;">${badgeMap[priority]}</div>
          <p>Xin chào <strong>${customerName}</strong>,</p>
          <p>Rất tiếc phải thông báo sân <strong>"${courtName}"</strong> đã ngừng hoạt động vĩnh viễn.</p>
          <p>Lịch đặt sân của bạn:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0;">
            <p style="margin:0;font-size:16px;">📅 <strong>${dateStr}</strong></p>
            <p style="margin:8px 0 0;font-size:16px;">🕐 <strong>${timeStr}</strong></p>
          </div>
          <p>đã bị <strong style="color:#dc2626;">hủy tự động</strong>.</p>
          ${noteMap[priority]}
          <p>Chúng tôi thành thật xin lỗi vì sự bất tiện này.</p>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/courts" style="background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">Đặt sân khác ngay</a>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center;">Zen8Labs Court Booking - Chân thành cảm ơn sự thông cảm của quý khách.</p>
        </div>
      `,
    }).catch(err => console.error(`Lỗi gửi mail [${priority}] tới ${to}:`, err));
  }
  async sendBookingConfirmation(params: {
    to: string;
    customerName: string;
    courtName: string;
    startTime: Date;
    endTime: Date;
    totalPrice: number;
    paymentMethod: string;
    paymentStatus: string;
  }) {
    const { to, customerName, courtName, startTime, endTime, totalPrice, paymentMethod, paymentStatus } = params;
    const timeStr = `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`;
    const dateStr = format(startTime, "EEEE, dd/MM/yyyy", { locale: vi });
    const formattedPrice = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalPrice);

    await this.transporter.sendMail({
      from: `"Zen8Labs Court Booking" <${process.env.SMTP_USER}>`,
      to,
      subject: `✅ Xác nhận đặt sân "${courtName}" thành công`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0f766e; text-align: center;">Xác nhận đặt sân</h2>
          <p>Xin chào <strong>${customerName}</strong>,</p>
          <p>Cảm ơn bạn đã sử dụng dịch vụ của Zen8Labs Court Booking. Dưới đây là thông tin lịch đặt sân của bạn:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold; width: 40%;">Sân:</td>
              <td style="padding: 12px;">${courtName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold;">Ngày đá:</td>
              <td style="padding: 12px; color: #0f766e; font-weight: bold;">${dateStr}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold;">Thời gian:</td>
              <td style="padding: 12px; color: #0f766e; font-weight: bold;">${timeStr}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold;">Tổng tiền:</td>
              <td style="padding: 12px; font-size: 16px; color: #dc2626; font-weight: bold;">${formattedPrice}</td>
            </tr>
            <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight: bold;">Phương thức:</td>
              <td style="padding: 12px;">${paymentMethod === 'ONLINE' ? 'Thanh toán trực tuyến (Đã thanh toán)' : 'Thanh toán tại sân (Chờ duyệt)'}</td>
            </tr>
          </table>

          <p style="background:#fffbeb;border-left:4px solid #f59e0b;padding:12px;color:#92400e;">
            <strong>Lưu ý:</strong> Vui lòng có mặt trước giờ đá 10 phút. Nếu cần hủy lịch, hãy thực hiện trên hệ thống trước giờ đá ít nhất 2 tiếng.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile" style="background-color: #14b8a6; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">Xem lịch của tôi</a>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center;">Zen8Labs Court Booking - Hẹn gặp bạn tại sân!</p>
        </div>
      `,
    }).catch(err => console.error('Lỗi gửi mail xác nhận đặt sân:', err));
  }
}
