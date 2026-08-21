// backend/src/doctors/doctors.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { Role } from '../users/entities/user.entity';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  /** Find doctor profile by the linked userId (for /me endpoint) */
  async findByUserId(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: { 
        specialty: true, 
        user: { select: { id: true, name: true, email: true, role: true, preferences: true, notificationSettings: true, privacySettings: true } },
        reviews: { select: { rating: true } }
      },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    const reviewCount = doctor.reviews.length;
    const ratingAverage = reviewCount > 0 
      ? Number((doctor.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
      : 0;
    return { ...doctor, ratingAverage };
  }
  /** Search doctors with optional filters (specialty, city, rating, price, availability) */
  async findAll(filters: any) {
    const where: any = {};
    if (filters.specialty) where.specialtyId = filters.specialty;
    if (filters.search) {
      where.OR = [
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { specialty: { name: { contains: filters.search, mode: 'insensitive' } } }
      ];
    }
    if (filters.city) where.clinicAddress = { contains: filters.city, mode: 'insensitive' };
    if (filters.minRating) where.ratingAverage = { gte: Number(filters.minRating) };
    if (filters.maxPrice) where.consultationFee = { lte: Number(filters.maxPrice) };
    // Availability filter can be added later with a join on Availability model.
    const doctors = await this.prisma.doctor.findMany({
      where,
      include: { 
        specialty: true, 
        user: true, 
        reviews: { select: { rating: true } }
      },
    });
    return doctors.map(doc => {
      const reviewCount = doc.reviews.length;
      const ratingAverage = reviewCount > 0 
        ? Number((doc.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
        : 0;
      return {
        ...doc,
        ratingAverage,
        _count: { reviews: reviewCount }
      };
    });
  }

  /** Get full doctor profile */
  async findOne(id: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: { 
        specialty: true, 
        user: { select: { name: true, email: true } }, 
        reviews: { include: { patient: { select: { name: true } } } }, 
        availabilities: true 
      },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    const reviewCount = doctor.reviews.length;
    const ratingAverage = reviewCount > 0 
      ? Number((doctor.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
      : 0;
    return { ...doctor, ratingAverage };
  }

  /** Create a doctor profile – used by admin when approving a doctor */
  async create(dto: CreateDoctorDto) {
    return this.prisma.doctor.create({ data: dto });
  }

  /** Update doctor profile – only the owner doctor or admin can modify */
  async updateProfile(doctorId: string, dto: UpdateDoctorDto, userId?: string, role?: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (userId && role !== 'ADMIN' && doctor.userId !== userId) {
      throw new ForbiddenException('You can only update your own doctor profile');
    }

    return this.prisma.doctor.update({ where: { id: doctorId }, data: dto });
  }

  /** Upsert doctor profile for /me */
  async upsertMyProfile(userId: string, dto: UpdateDoctorDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    
    let latVal = dto.latitude;
    let lngVal = dto.longitude;

    if (dto.clinicAddress && (!doctor || doctor.clinicAddress !== dto.clinicAddress) && !dto.latitude) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(dto.clinicAddress)}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MedFinder-NestJS-Application' } });
        const data = await res.json();
        if (data && data.length > 0) {
          latVal = parseFloat(data[0].lat);
          lngVal = parseFloat(data[0].lon);
        }
      } catch (err) {
        console.error('Backend geocoding failed:', err);
      }
    }

    const payload = {
      ...dto,
      ...(latVal !== undefined ? { latitude: latVal } : {}),
      ...(lngVal !== undefined ? { longitude: lngVal } : {})
    };

    if (doctor) {
      return this.prisma.doctor.update({ where: { id: doctor.id }, data: payload });
    } else {
      let defaultSpecialty = await this.prisma.specialty.findFirst();
      if (!defaultSpecialty) {
        defaultSpecialty = await this.prisma.specialty.create({ data: { name: 'General Practice' }});
      }
      return this.prisma.doctor.create({
        data: {
          userId,
          specialtyId: payload.specialtyId || defaultSpecialty.id,
          bio: payload.bio || '',
          clinicAddress: payload.clinicAddress || 'To be updated',
          latitude: latVal || null,
          longitude: lngVal || null,
          consultationFee: payload.consultationFee || 100,
          city: dto.city || 'Tunis',
          country: dto.country || 'Tunisia',
        }
      });
    }
  }

  async getAvailableSlots(doctorId: string, dateString: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { availabilities: true }
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    // Get availabilities for this specific date
    const dayAvailabilities = doctor.availabilities.filter(
      (a) => a.date === dateString
    );

    if (dayAvailabilities.length === 0) {
      return [];
    }

    // Generate hourly slots for each availability period
    const slots: string[] = [];
    for (const avail of dayAvailabilities) {
      const [startHours, startMins] = avail.startTime.split(':').map(Number);
      const [endHours, endMins] = avail.endTime.split(':').map(Number);

      let currentMins = startHours * 60 + startMins;
      const endTotalMins = endHours * 60 + endMins;

      // Add slots every 60 minutes
      while (currentMins + 60 <= endTotalMins) {
        const h = Math.floor(currentMins / 60);
        const m = currentMins % 60;
        const time24 = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (!slots.includes(time24)) {
          slots.push(time24);
        }
        currentMins += 60;
      }
    }

    // Get all active appointments for this doctor on this day
    const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateString}T23:59:59.999Z`);
    
    const appointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'COMPLETED']
        }
      },
      select: {
        startTime: true
      }
    });

    const bookedTimes = new Set(appointments.map(a => a.startTime));

    const availableSlots = slots.filter(time24 => !bookedTimes.has(time24));

    return availableSlots;
  }
}
