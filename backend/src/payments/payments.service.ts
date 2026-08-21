import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto, userId?: string, role?: string) {
    let authoritativeAmount = createPaymentDto.amount;

    if (createPaymentDto.appointmentId) {
      const appt = await this.prisma.appointment.findUnique({
        where: { id: createPaymentDto.appointmentId },
        include: { doctor: true },
      });
      if (!appt) throw new NotFoundException('Appointment not found');
      if (userId && role !== 'ADMIN' && appt.patientId !== userId) {
        throw new ForbiddenException('You cannot create payment for another user appointment');
      }
      if (appt.doctor?.consultationFee) {
        authoritativeAmount = appt.doctor.consultationFee;
      }
    }

    if (createPaymentDto.orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: createPaymentDto.orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (userId && role !== 'ADMIN' && order.patientId !== userId) {
        throw new ForbiddenException('You cannot create payment for another user order');
      }
      authoritativeAmount = order.totalPrice;
    }

    return this.prisma.payment.create({
      data: {
        appointmentId: createPaymentDto.appointmentId,
        orderId: createPaymentDto.orderId,
        amount: authoritativeAmount,
        method: createPaymentDto.method || 'Card',
        status: PaymentStatus.PENDING,
      },
    });
  }

  async createPaymentIntent(amount: number, currency: string) {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (stripeKey && !stripeKey.includes('placeholder')) {
      try {
        const stripe = new Stripe(stripeKey, {
          apiVersion: '2023-10-16' as any,
        });

        // Amount in cents for Stripe (e.g. 10.00 TND = 1000 cents)
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: currency?.toLowerCase() || 'usd',
          payment_method_types: ['card'],
        });

        return {
          clientSecret: paymentIntent.client_secret,
          id: paymentIntent.id,
        };
      } catch (err: any) {
        console.warn('Stripe API call failed, falling back to sandbox simulation:', err.message);
      }
    }

    // Sandbox simulated client secret
    return {
      clientSecret: `pi_simulated_${Date.now()}_secret_${Math.random().toString(36).substring(2, 11)}`,
      id: `pi_simulated_${Date.now()}`,
    };
  }

  async verifyPayment(id: string, userId?: string, role?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { appointment: true, order: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    if (userId && role !== 'ADMIN') {
      const isAppointmentOwner = payment.appointment && payment.appointment.patientId === userId;
      const isOrderOwner = payment.order && payment.order.patientId === userId;
      if (!isAppointmentOwner && !isOrderOwner) {
        throw new ForbiddenException('You do not have permission to verify this payment');
      }
    }

    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.COMPLETED },
    });
  }

  async refundPayment(id: string) {
    return this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });
  }

  async handleWebhookEvent(event: any) {
    if (event && event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data?.object;
      const paymentIntentId = paymentIntent?.id;
      const paymentId = paymentIntent?.metadata?.paymentId;

      let payment: any = null;
      if (paymentIntentId) {
        payment = await this.prisma.payment.findFirst({
          where: { stripePaymentIntentId: paymentIntentId },
          include: { appointment: true, order: true },
        });
      }
      if (!payment && paymentId) {
        payment = await this.prisma.payment.findUnique({
          where: { id: paymentId },
          include: { appointment: true, order: true },
        });
      }

      if (payment) {
        if (payment.status === PaymentStatus.COMPLETED) {
          return { received: true, message: 'Payment already processed' };
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: PaymentStatus.COMPLETED },
          });

          if (payment.orderId) {
            await tx.order.update({
              where: { id: payment.orderId },
              data: { status: 'PAID' },
            });
          }

          if (payment.appointmentId) {
            await tx.appointment.update({
              where: { id: payment.appointmentId },
              data: { status: 'CONFIRMED' },
            });
          }
        });
      }
    }

    return { received: true };
  }

  async findAll() {
    return this.prisma.payment.findMany({
      include: { appointment: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
