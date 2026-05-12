/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // ZaloPay Sandbox Config (Thường thì để trong .env, ở đây hardcode để bạn dễ test ngay)
  // Bạn có thể đăng ký sandbox riêng và thay đổi các key này
  private readonly ZALOPAY_CONFIG = {
    app_id: process.env.ZALOPAY_APP_ID || '2553', // Sandbox default
    key1: process.env.ZALOPAY_KEY1 || 'PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL',
    key2: process.env.ZALOPAY_KEY2 || 'kLtgPl8YEStV610wzZ1T817O6X1wiK3a',
    endpoint: 'https://sb-openapi.zalopay.vn/v2/create',
    refundEndpoint: 'https://sb-openapi.zalopay.vn/v2/refund',
  };

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) { }

  /**
   * Bước 1: Tạo Payment Order với ZaloPay
   */
  async createZaloPayOrder(
    bookingId: string,
    amount: number,
    customerName: string,
  ) {
    const date = new Date();
    // Format required: YYMMDD_id
    const dateStr = date.toISOString().slice(2, 10).replace(/-/g, '');
    const appTransId = `${dateStr}_${uuidv4().substring(0, 8)}`;

    const appTime = Date.now();
    const embedData = JSON.stringify({ bookingId });
    const items = JSON.stringify([
      {
        itemid: bookingId,
        itemname: 'Đặt sân cầu lông',
        itemprice: amount,
        itemquantity: 1,
      },
    ]);

    // Callback URL (Cần dùng ngrok khi test local)
    // Ví dụ: https://my-ngrok-url.ngrok.io/payments/zalopay/callback
    const callbackUrl = process.env.BACKEND_PUBLIC_URL
      ? `${process.env.BACKEND_PUBLIC_URL}/payments/zalopay/callback`
      : 'https://webhook.site/placeholder'; // Placeholder để tránh lỗi nếu quên config

    const appUser = customerName || 'user';
    // Tạo chữ ký (HMAC-SHA256) - Phải đúng thứ tự theo tài liệu ZaloPay
    const dataStr = `${this.ZALOPAY_CONFIG.app_id}|${appTransId}|${appUser}|${Math.round(amount)}|${appTime}|${embedData}|${items}`;
    const mac = crypto
      .createHmac('sha256', this.ZALOPAY_CONFIG.key1)
      .update(dataStr)
      .digest('hex');

    const payload = {
      app_id: Number(this.ZALOPAY_CONFIG.app_id),
      app_user: customerName || 'user',
      app_trans_id: appTransId,
      app_time: appTime,
      amount: Math.round(amount),
      item: items,
      embed_data: embedData,
      description: `Thanh toán đặt sân Z8L - Booking ${bookingId.substring(0, 6)}`,
      bank_code: 'zalopayapp', // Mặc định mở app ZaloPay (nếu dùng đt)
      callback_url: callbackUrl,
      mac: mac,
      expire_duration_seconds: 600, // 10 phút
    };

    try {
      this.logger.log(`Creating ZaloPay order for booking ${bookingId}`);
      const response = await axios.post(this.ZALOPAY_CONFIG.endpoint, payload);

      if (response.data.return_code !== 1) {
        throw new BadRequestException(
          `Lỗi tạo ZaloPay order: ${response.data.return_message}`,
        );
      }

      // Lưu Payment vào DB (Trạng thái PENDING)
      // Dùng upsert thay vì create để tránh lỗi Unique constraint failed khi khách bấm "Thanh toán tiếp"
      await this.prisma.payment.upsert({
        where: { bookingId },
        update: {
          appTransId,
          amount,
          status: 'PENDING',
          gateway: 'ZALOPAY',
        },
        create: {
          bookingId,
          appTransId,
          amount,
          status: 'PENDING',
          gateway: 'ZALOPAY',
        },
      });

      return {
        payUrl: response.data.order_url, // Trả url này về frontend để redirect
        appTransId,
      };
    } catch (error) {
      this.logger.error('ZaloPay Create Order Error:', error);
      throw new BadRequestException(
        'Không thể khởi tạo thanh toán ZaloPay lúc này.',
      );
    }
  }

  /**
   * Bước 2: Xử lý Webhook từ ZaloPay gọi về (Idempotency)
   */
  async handleZaloPayCallback(body: any) {
    this.logger.log('Received ZaloPay Webhook');

    try {
      // ZaloPay gửi { data: string, mac: string, type: number }
      const dataStr = body.data;
      const reqMac = body.mac;

      // 1. Verify chữ ký bằng KEY2 để tránh fake request
      const expectedMac = crypto
        .createHmac('sha256', this.ZALOPAY_CONFIG.key2)
        .update(dataStr)
        .digest('hex');
      if (reqMac !== expectedMac) {
        this.logger.warn('ZaloPay Callback Invalid MAC');
        // Phải trả về format chuẩn của ZaloPay
        return { return_code: -1, return_message: 'mac not equal' };
      }

      const cbData = JSON.parse(dataStr);
      this.logger.log(
        `ZaloPay Callback valid. app_trans_id: ${cbData.app_trans_id}`,
      );

      // 2. Kiểm tra Idempotency (Chống xử lý 2 lần nếu ZaloPay gọi lại)
      const payment = await this.prisma.payment.findUnique({
        where: { appTransId: cbData.app_trans_id },
      });

      if (!payment) {
        this.logger.warn(
          `Payment not found for app_trans_id: ${cbData.app_trans_id}`,
        );
        return { return_code: -1, return_message: 'Payment not found' };
      }

      if (payment.status === 'SUCCESS') {
        // Đã xử lý rồi, chỉ trả về 1 để báo ZaloPay đừng gọi nữa
        this.logger.log('Payment already processed (Idempotency skip)');
        return { return_code: 1, return_message: 'Already processed' };
      }

      // 3. Update DB (Sử dụng Transaction)
      await this.prisma.$transaction(async (tx) => {
        // Cập nhật bảng Payment
        await tx.payment.update({
          where: { appTransId: cbData.app_trans_id },
          data: {
            status: 'SUCCESS',
            gatewayTransId: String(cbData.zp_trans_id),
            rawCallback: body, // Lưu raw để debug sau này
          },
        });

        // Cập nhật trạng thái Booking
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: 'PAID',
            status: 'CONFIRMED',
          },
        });
      });

      // 4. Gửi Email Xác Nhận (Ngoại biên transaction)
      const bookingInfo = await this.prisma.booking.findUnique({
        where: { id: payment.bookingId },
        include: { user: true, court: true },
      });

      if (bookingInfo) {
        this.mailService
          .sendBookingConfirmation({
            to: bookingInfo.user.email,
            customerName: bookingInfo.user.fullName,
            courtName: bookingInfo.court.name,
            startTime: bookingInfo.startTime,
            endTime: bookingInfo.endTime,
            totalPrice: Number(bookingInfo.totalPrice),
            paymentMethod: bookingInfo.paymentMethod,
            paymentStatus: 'PAID',
          })
          .catch((err) => this.logger.error('Failed to send mail', err));
      }

      return { return_code: 1, return_message: 'success' };
    } catch (error) {
      this.logger.error('ZaloPay Callback Processing Error:', error);
      return { return_code: 0, return_message: 'internal error' };
    }
  }

  /**
   * Bước 3: Hoàn tiền (Refund) khi khách hàng hủy booking đúng hạn
   */
  async refundPayment(bookingId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
    });

    if (!payment || payment.status !== 'SUCCESS') {
      throw new BadRequestException(
        'Không tìm thấy giao dịch thành công để hoàn tiền.',
      );
    }

    if (payment.gateway === 'PAYPAL') {
      this.logger.log(
        `[PAYPAL] Giả lập hoàn tiền thành công cho giao dịch ${payment.gatewayTransId}`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'REFUNDED',
          refundId: `PP_REFUND_${Date.now()}`,
        },
      });
      return {
        success: true,
        message: 'Hoàn tiền PayPal thành công',
        refundId: `PP_REFUND_${Date.now()}`,
      };
    }

    const timestamp = Date.now();
    const description = `Hoàn tiền hủy sân (Booking: ${bookingId.substring(0, 6)})`;

    // Tạo chữ ký Refund
    const dataStr = `${this.ZALOPAY_CONFIG.app_id}|${payment.gatewayTransId}|${payment.amount}|${description}|${timestamp}`;
    const mac = crypto
      .createHmac('sha256', this.ZALOPAY_CONFIG.key1)
      .update(dataStr)
      .digest('hex');

    const payload = {
      m_refund_id: `${dateStr()}_${this.ZALOPAY_CONFIG.app_id}_${payment.gatewayTransId}`, // Định dạng yêu cầu của ZP
      app_id: Number(this.ZALOPAY_CONFIG.app_id),
      zp_trans_id: payment.gatewayTransId,
      amount: Number(payment.amount),
      timestamp: timestamp,
      description: description,
      mac: mac,
    };

    try {
      this.logger.log(`Refunding payment for booking: ${bookingId}`);
      const response = await axios.post(
        this.ZALOPAY_CONFIG.refundEndpoint,
        payload,
      );

      if (response.data.return_code === 1) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            refundId: String(response.data.refund_id),
          },
        });
        return {
          success: true,
          message: 'Hoàn tiền thành công',
          refundId: response.data.refund_id,
        };
      } else {
        throw new BadRequestException(
          `Lỗi từ cổng thanh toán khi hoàn tiền: ${response.data.return_message}`,
        );
      }
    } catch (error) {
      this.logger.error('ZaloPay Refund Error:', error);
      throw new BadRequestException(
        'Không thể hoàn tiền lúc này, vui lòng liên hệ admin.',
      );
    }
  }
}

function dateStr() {
  return new Date().toISOString().slice(2, 10).replace(/-/g, '');
}
