import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SpecialtiesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.specialty.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getSpecialtiesWithDoctorCount() {
    const specialties = await this.prisma.specialty.findMany({
      include: { doctors: { select: { id: true } } },
      orderBy: { name: 'asc' },
    });
    return specialties.map(s => ({ name: s.name, doctorCount: s.doctors.length }));
  }

  /**
   * Return top specialties sorted by doctor count, limited to `limit` (default 8).
   */
  async getTopSpecialties(limit: number = 8) {
    const all = await this.prisma.specialty.findMany({
      include: { doctors: { select: { id: true } } },
    });
    const sorted = all
      .map(s => ({ name: s.name, doctorCount: s.doctors.length }))
      .sort((a, b) => b.doctorCount - a.doctorCount)
      .slice(0, limit);
    return sorted;
  }


  async seed() {
    const defaultSpecialties = [
      'Cardiology',
      'Dermatology',
      'Endocrinology',
      'Gastroenterology',
      'Neurology',
      'Orthopedics',
      'Pediatrics',
      'Psychiatry',
      'General Practice',
      'Dentistry'
    ];

    for (const name of defaultSpecialties) {
      const exists = await this.prisma.specialty.findFirst({ where: { name } });
      if (!exists) {
        await this.prisma.specialty.create({ data: { name } });
      }
    }
    return { message: 'Specialties seeded successfully' };
  }
}
