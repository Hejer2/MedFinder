import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalUsers, totalDoctors, totalPharmacies, totalAppointments, totalOrders] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.doctor.count(),
      this.prisma.pharmacy.count(),
      this.prisma.appointment.count(),
      this.prisma.order.count(),
    ]);

    // Calculate real appointment distribution over the past 7 days
    const now = new Date();
    const days: { label: string; count: number; dayIndex: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const startOfDay = new Date(d);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const count = await this.prisma.appointment.count({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      days.push({
        label: dayNames[d.getDay()],
        count,
        dayIndex: i,
      });
    }

    return {
      totalUsers,
      totalDoctors,
      totalPharmacies,
      totalAppointments,
      totalOrders,
      weeklyActivity: days,
    };
  }
}
