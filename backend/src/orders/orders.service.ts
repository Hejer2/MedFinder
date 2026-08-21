import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: string, dto: CreateOrderDto) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: dto.pharmacyId },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy profile not found');
    }

    const medicineIds = dto.items.map(item => item.medicineId);
    const medicines = await this.prisma.medicine.findMany({
      where: {
        id: { in: medicineIds },
        pharmacyId: dto.pharmacyId,
      },
    });

    if (medicines.length !== medicineIds.length) {
      throw new BadRequestException('Some medicines are invalid or do not belong to this pharmacy');
    }

    let requiresPrescription = false;
    const medicineMap = new Map<string, typeof medicines[0]>();
    for (const med of medicines) {
      medicineMap.set(med.id, med);
      if (med.status === 'PRESCRIPTION_REQUIRED' && med.requireUpload) {
        requiresPrescription = true;
      }
    }

    if (requiresPrescription && !dto.prescriptionUrl) {
      throw new BadRequestException('Prescription required for this order. Please upload a prescription.');
    }

    // Validate available stock for each requested item
    for (const item of dto.items) {
      const med = medicineMap.get(item.medicineId);
      if (!med) continue;
      if (med.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${med.name}". Requested: ${item.quantity}, Available in stock: ${med.stock}`
        );
      }
    }

    const isDelivery = dto.deliveryMethod === 'DELIVERY';
    const deliveryFee = isDelivery ? (pharmacy.deliveryFee !== undefined ? pharmacy.deliveryFee : 7.00) : 0.00;

    let totalPrice = deliveryFee;
    for (const item of dto.items) {
      const med = medicineMap.get(item.medicineId);
      if (med) {
        totalPrice += med.price * item.quantity;
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Decrement stock atomically
      for (const item of dto.items) {
        const updatedMed = await tx.medicine.update({
          where: { id: item.medicineId },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        // Automatically mark out of stock when quantity hits 0
        if (updatedMed.stock <= 0) {
          await tx.medicine.update({
            where: { id: item.medicineId },
            data: { status: 'OUT_OF_STOCK' },
          });
        }
      }

      // 2. Create the order record
      const order = await tx.order.create({
        data: {
          patientId,
          pharmacyId: dto.pharmacyId,
          status: 'PENDING',
          totalPrice,
          prescriptionUrl: dto.prescriptionUrl || null,
          deliveryMethod: dto.deliveryMethod || 'PICKUP',
          deliveryAddress: isDelivery ? dto.deliveryAddress : null,
          deliveryPhone: isDelivery ? dto.deliveryPhone : null,
          deliveryFee,
        },
      });

      const orderItemsData = dto.items.map(item => {
        const med = medicineMap.get(item.medicineId);
        return {
          orderId: order.id,
          medicineId: item.medicineId,
          quantity: item.quantity,
          price: med ? med.price : 0,
        };
      });

      await tx.orderItem.createMany({
        data: orderItemsData,
      });

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          items: {
            include: {
              medicine: true,
            },
          },
        },
      });
    });
  }

  async pay(orderId: string, userId?: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && role !== 'ADMIN' && order.patientId !== userId) {
      throw new ForbiddenException('You do not have permission to pay for this order');
    }

    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      return order;
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId,
          amount: order.totalPrice,
          method: 'Card',
          status: 'COMPLETED',
        },
      });

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
        include: {
          items: {
            include: {
              medicine: true,
            },
          },
        },
      });
    });
  }

  async findAllByPatient(patientId: string) {
    return this.prisma.order.findMany({
      where: { patientId },
      include: {
        pharmacy: {
          include: {
            user: { select: { name: true, phone: true } },
          },
        },
        items: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByPharmacy(userId: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { userId },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy profile not found');
    }

    return this.prisma.order.findMany({
      where: { pharmacyId: pharmacy.id },
      include: {
        patient: {
          select: { name: true, email: true, phone: true },
        },
        items: {
          include: {
            medicine: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(orderId: string, status: string, userId: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { userId },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy profile not found');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.pharmacyId !== pharmacy.id) {
      throw new ForbiddenException('You do not have permission to modify this order');
    }

    return this.prisma.$transaction(async (tx) => {
      // If cancelling an order, restore stock
      if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
        for (const item of order.items) {
          const restored = await tx.medicine.update({
            where: { id: item.medicineId },
            data: { stock: { increment: item.quantity } },
          });
          if (restored.stock > 0 && restored.status === 'OUT_OF_STOCK') {
            await tx.medicine.update({
              where: { id: item.medicineId },
              data: { status: 'AVAILABLE' },
            });
          }
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
        include: {
          items: {
            include: {
              medicine: true,
            },
          },
          patient: {
            select: { name: true, email: true, phone: true },
          },
        },
      });
    });
  }

  async findOne(orderId: string, userId?: string, role?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        patient: {
          select: { name: true, email: true, phone: true },
        },
        pharmacy: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (userId && role !== 'ADMIN') {
      const isPatient = order.patientId === userId;
      const isPharmacyOwner = order.pharmacy?.userId === userId;
      if (!isPatient && !isPharmacyOwner) {
        throw new ForbiddenException('You do not have permission to access this order');
      }
    }

    return order;
  }
}
