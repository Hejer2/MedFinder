import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: string, createAppointmentDto: CreateAppointmentDto) {
    const { doctorId, date, notes } = createAppointmentDto;
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new BadRequestException('Invalid appointment date format');
    }

    const startTime = `${dateObj.getUTCHours().toString().padStart(2, '0')}:${dateObj.getUTCMinutes().toString().padStart(2, '0')}`;

    // Concurrency-safe atomic transaction to prevent double booking
    return this.prisma.$transaction(async (tx) => {
      // Find beginning and end of the requested day in UTC
      const startOfDay = new Date(dateObj);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Verify if an active conflicting booking already exists for this doctor/slot
      const existingActiveAppt = await tx.appointment.findFirst({
        where: {
          doctorId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          startTime,
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
      });

      if (existingActiveAppt) {
        throw new ConflictException(
          `The selected time slot (${startTime}) on this date is already booked. Please choose an alternative slot.`
        );
      }

      const appt = await tx.appointment.create({
        data: {
          doctorId,
          patientId,
          date: dateObj,
          startTime,
          notes: notes || null,
          status: 'PENDING',
        },
      });

      return this.mapStatusToFrontend(appt);
    });
  }

  private mapStatusToFrontend(appt: any) {
    if (!appt) return null;
    let status = appt.status as string;
    if (appt.status === 'CONFIRMED') {
      status = 'ACCEPTED';
    } else if (appt.status === 'CANCELLED') {
      status = 'CANCELLED';
    }
    return { ...appt, status };
  }

  private mapStatusToDatabase(status: string): any {
    if (status === 'ACCEPTED') return 'CONFIRMED';
    if (status === 'REJECTED') return 'CANCELLED';
    return status;
  }

  async findAllByPatient(patientId: string) {
    const appts = await this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            user: { select: { name: true, email: true } },
            specialty: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
    return appts.map((a) => this.mapStatusToFrontend(a));
  }

  async findAllByDoctor(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) return [];
    const appts = await this.prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      include: { patient: { select: { id: true, name: true, email: true } } },
      orderBy: { date: 'desc' },
    });
    return appts.map((a) => this.mapStatusToFrontend(a));
  }

  async findOne(id: string, userId?: string, role?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true, patient: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (userId && role !== 'ADMIN') {
      const isPatient = appointment.patientId === userId;
      const isDoctor = appointment.doctor?.userId === userId;
      if (!isPatient && !isDoctor) {
        throw new ForbiddenException('You do not have permission to access this appointment');
      }
    }

    return this.mapStatusToFrontend(appointment);
  }

  async updateStatus(id: string, status: string, userId: string, role?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (role !== 'ADMIN') {
      const isPatient = appointment.patientId === userId;
      const isDoctor = appointment.doctor?.userId === userId;
      if (!isPatient && !isDoctor) {
        throw new ForbiddenException('You do not have permission to modify this appointment');
      }
    }

    const dbStatus = this.mapStatusToDatabase(status);

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: dbStatus },
    });

    return this.mapStatusToFrontend(updated);
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, userId: string, role?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (role !== 'ADMIN') {
      const isPatient = appointment.patientId === userId;
      const isDoctor = appointment.doctor?.userId === userId;
      if (!isPatient && !isDoctor) {
        throw new ForbiddenException('You do not have permission to modify this appointment');
      }
    }

    const { dateTime, status, notes } = updateAppointmentDto;
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = this.mapStatusToDatabase(status);
    }
    if (notes !== undefined) {
      updateData.notes = notes;
    }
    if (dateTime) {
      const dateObj = new Date(dateTime);
      updateData.date = dateObj;
      updateData.startTime = `${dateObj.getUTCHours().toString().padStart(2, '0')}:${dateObj.getUTCMinutes().toString().padStart(2, '0')}`;
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
    });
    return this.mapStatusToFrontend(updated);
  }

  async remove(id: string, userId: string, role?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (role !== 'ADMIN') {
      const isPatient = appointment.patientId === userId;
      const isDoctor = appointment.doctor?.userId === userId;
      if (!isPatient && !isDoctor) {
        throw new ForbiddenException('You do not have permission to delete this appointment');
      }
    }

    return this.prisma.appointment.delete({
      where: { id },
    });
  }
}
