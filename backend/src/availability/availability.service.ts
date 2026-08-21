import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { date: string; startTime: string; endTime: string }) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    // Parse date safely
    const startOfDay = new Date(`${data.date}T00:00:00.000Z`);
    const endOfDay = new Date(`${data.date}T23:59:59.999Z`);

    // Check if there are any active appointments that overlap with this range
    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
        }
      }
    });

    if (conflictingAppointment) {
      // Validate hourly overlap
      const apptTime = conflictingAppointment.startTime; // e.g. "10:00"
      if (apptTime >= data.startTime && apptTime < data.endTime) {
        throw new BadRequestException(`Cannot add availability: you already have an appointment booked at ${apptTime} on this date.`);
      }
    }

    return this.prisma.availability.create({
      data: {
        doctorId: doctor.id,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });
  }

  async findAllByDoctor(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return this.prisma.availability.findMany({
      where: {
        doctorId: doctor.id,
        date: { gte: todayStr },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }

  async remove(id: string, userId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const availability = await this.prisma.availability.findUnique({ where: { id } });
    if (!availability) throw new NotFoundException('Availability not found');

    if (availability.doctorId !== doctor.id) {
      throw new UnauthorizedException('Not allowed');
    }

    return this.prisma.availability.delete({ where: { id } });
  }
}
