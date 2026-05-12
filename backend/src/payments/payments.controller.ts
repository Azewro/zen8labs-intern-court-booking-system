import { Controller, Post, Body, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Webhook endpoint cho ZaloPay gọi vào (KHÔNG có Auth Guard)
  @Post('zalopay/callback')
  async handleZaloPayCallback(@Body() body: any) {
    return this.paymentsService.handleZaloPayCallback(body);
  }
}
