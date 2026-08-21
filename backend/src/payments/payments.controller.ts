import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request, Headers, BadRequestException, HttpCode, HttpStatus, UsePipes, ValidationPipe } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { StripeWebhookDto } from './dto/stripe-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import Stripe from 'stripe';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  create(@Body() createPaymentDto: CreatePaymentDto, @Request() req: any) {
    return this.paymentsService.create(createPaymentDto, req.user.userId, req.user.role);
  }

  @Post('create-intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  createPaymentIntent(
    @Body('amount') amount: number,
    @Body('currency') currency: string,
  ) {
    return this.paymentsService.createPaymentIntent(amount, currency);
  }

  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  verifyPayment(@Param('id') id: string, @Request() req: any) {
    return this.paymentsService.verifyPayment(id, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/refund')
  refundPayment(@Param('id') id: string) {
    return this.paymentsService.refundPayment(id);
  }

  @Roles(Role.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  /** Public Stripe Webhook Endpoint */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: false }))
  async handleWebhook(
    @Body() payload: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (webhookSecret && stripeKey && !webhookSecret.includes('placeholder')) {
      if (!signature) {
        throw new BadRequestException('Missing stripe-signature header');
      }

      const stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16' as any,
      });

      try {
        const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
        return this.paymentsService.handleWebhookEvent(event);
      } catch (err: any) {
        throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
      }
    }

    // Process event directly if sandbox / dev environment
    return this.paymentsService.handleWebhookEvent(payload);
  }
}
