import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        dateOfBirth: true,
        preferences: true,
        notificationSettings: true,
        privacySettings: true,
        medicalInfo: true,
        phone: true
      }
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, data: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email,
        dateOfBirth: data.dateOfBirth !== undefined ? data.dateOfBirth : undefined,
        preferences: data.preferences !== undefined ? data.preferences : undefined,
        notificationSettings: data.notificationSettings !== undefined ? data.notificationSettings : undefined,
        privacySettings: data.privacySettings !== undefined ? data.privacySettings : undefined,
        medicalInfo: data.medicalInfo !== undefined ? data.medicalInfo : undefined,
        phone: data.phone !== undefined ? data.phone : undefined,
      },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        role: true,
        dateOfBirth: true,
        preferences: true,
        notificationSettings: true,
        privacySettings: true,
        medicalInfo: true,
        phone: true 
      }
    });
  }

  async updatePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const match = await bcrypt.compare(oldPass, user.password);
    if (!match) throw new UnauthorizedException('Invalid current password');
    const hashed = await bcrypt.hash(newPass, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed }
    });
    return { message: 'Password updated successfully' };
  }

  async resetPassword(userId: string, newHashedPass: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPass }
    });
    return { success: true };
  }

  async create(data: any) {
    return this.prisma.user.create({
      data,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async verifyUserEmail(email: string) {
    return this.prisma.user.update({
      where: { email },
      data: { isEmailVerified: true },
    });
  }

  async findOneProfile(requesterId: string, role: string, targetUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        dateOfBirth: true,
        phone: true,
        medicalInfo: true,
      },
    });
    if (!user) throw new NotFoundException('Profile not found');

    if (requesterId === targetUserId || role === 'ADMIN') {
      return user;
    }

    if (role === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: requesterId } });
      if (!doctor) {
        throw new ForbiddenException('Doctor profile not found');
      }

      const activeAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          patientId: targetUserId,
          status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
        },
      });

      if (!activeAppointment) {
        throw new ForbiddenException(
          'Access denied: You can only view clinical records for patients with an active or completed consultation',
        );
      }

      return user;
    }

    throw new ForbiddenException('You are not authorized to view this profile');
  }

  async updatePatientInfo(requesterId: string, role: string, targetUserId: string, medicalInfo: any) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException('User not found');

    const isSelf = requesterId === targetUserId;
    const isAdmin = role === 'ADMIN';
    let isAuthorizedDoctor = false;

    if (role === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: requesterId } });
      if (doctor) {
        const activeAppointment = await this.prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId: targetUserId,
            status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
          },
        });
        if (activeAppointment) {
          isAuthorizedDoctor = true;
        }
      }
    }

    if (!isSelf && !isAdmin && !isAuthorizedDoctor) {
      throw new ForbiddenException(
        'Access denied: You can only update clinical records for patients with an active or completed consultation',
      );
    }

    return this.prisma.user.update({
      where: { id: targetUserId },
      data: { medicalInfo },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        dateOfBirth: true,
        phone: true,
        medicalInfo: true,
      },
    });
  }
}
