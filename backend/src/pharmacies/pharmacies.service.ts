// backend/src/pharmacies/pharmacies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PharmaciesService {
  constructor(private prisma: PrismaService) {}

  async findByUserId(userId: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { userId },
      include: { 
        user: { select: { id: true, name: true, email: true, phone: true, role: true } },
        medicines: true
      },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy profile not found');
    return pharmacy;
  }

  async findOne(id: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        medicines: true
      },
    });
    if (!pharmacy) throw new NotFoundException('Pharmacy not found');
    return pharmacy;
  }

  async upsertMyProfile(userId: string, dto: any) {
    if (dto.name) {
      await this.prisma.user.update({ where: { id: userId }, data: { name: dto.name } });
    }
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { userId } });
    const { name, ...pharmacyData } = dto;

    if (pharmacyData.latitude !== undefined) pharmacyData.latitude = parseFloat(pharmacyData.latitude);
    if (pharmacyData.longitude !== undefined) pharmacyData.longitude = parseFloat(pharmacyData.longitude);
    if (pharmacyData.deliveryFee !== undefined) pharmacyData.deliveryFee = parseFloat(pharmacyData.deliveryFee);

    let latVal = pharmacyData.latitude;
    let lngVal = pharmacyData.longitude;

    if (pharmacyData.address && (!pharmacy || pharmacy.address !== pharmacyData.address) && !pharmacyData.latitude) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(pharmacyData.address)}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'MedFinder-NestJS-Application' } });
        const data = await res.json();
        if (data && data.length > 0) {
          latVal = parseFloat(data[0].lat);
          lngVal = parseFloat(data[0].lon);
        }
      } catch (err) {
        console.error('Backend pharmacy geocoding failed:', err);
      }
    }

    if (pharmacy) {
      return this.prisma.pharmacy.update({ 
        where: { id: pharmacy.id }, 
        data: {
          ...pharmacyData,
          ...(latVal !== undefined ? { latitude: latVal } : {}),
          ...(lngVal !== undefined ? { longitude: lngVal } : {})
        } 
      });
    } else {
      return this.prisma.pharmacy.create({
        data: {
          userId,
          address: pharmacyData.address || 'To be updated',
          latitude: latVal || null,
          longitude: lngVal || null,
          phone: pharmacyData.phone || '',
          city: pharmacyData.city || 'Tunis',
          country: pharmacyData.country || 'Tunisia',
          isOpen: pharmacyData.isOpen !== undefined ? pharmacyData.isOpen : true,
          hoursWeekdays: pharmacyData.hoursWeekdays || '08:00 - 22:00',
          hoursSaturday: pharmacyData.hoursSaturday || '08:00 - 20:00',
          hoursSunday: pharmacyData.hoursSunday || 'Closed',
          deliveryFee: pharmacyData.deliveryFee !== undefined ? parseFloat(pharmacyData.deliveryFee) : 7.00
        }
      });
    }
  }

  // ---------------------------------------------------------------------
  // Public method – return all pharmacies with basic info
  // ---------------------------------------------------------------------
  // Public method – return all pharmacies with basic info
  // ---------------------------------------------------------------------
  async findAll() {
    return this.prisma.pharmacy.findMany({
      include: { user: true },
    });
  }

  // ---------------------------------------------------------------------
  // Medicine Stock Catalog Management
  // ---------------------------------------------------------------------
  async getMedicines(pharmacyId: string) {
    return this.prisma.medicine.findMany({
      where: { pharmacyId },
    });
  }

  async createMedicine(userId: string, data: { name: string; description?: string; price: number; status?: string; requireUpload?: boolean }) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { userId } });
    if (!pharmacy) throw new NotFoundException('Pharmacy profile not found');

    return this.prisma.medicine.create({
      data: {
        pharmacyId: pharmacy.id,
        name: data.name,
        description: data.description,
        price: Number(data.price),
        status: data.status || 'AVAILABLE',
        requireUpload: data.requireUpload !== undefined ? Boolean(data.requireUpload) : true,
      },
    });
  }

  async updateMedicine(userId: string, id: string, data: { name?: string; description?: string; price?: number; status?: string; requireUpload?: boolean }) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { userId } });
    if (!pharmacy) throw new NotFoundException('Pharmacy profile not found');

    const medicine = await this.prisma.medicine.findFirst({
      where: { id, pharmacyId: pharmacy.id },
    });
    if (!medicine) throw new NotFoundException('Medicine not found in your inventory');

    return this.prisma.medicine.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        price: data.price !== undefined ? Number(data.price) : undefined,
        status: data.status,
        requireUpload: data.requireUpload !== undefined ? Boolean(data.requireUpload) : undefined,
      },
    });
  }

  async deleteMedicine(userId: string, id: string) {
    const pharmacy = await this.prisma.pharmacy.findUnique({ where: { userId } });
    if (!pharmacy) throw new NotFoundException('Pharmacy profile not found');

    const medicine = await this.prisma.medicine.findFirst({
      where: { id, pharmacyId: pharmacy.id },
    });
    if (!medicine) throw new NotFoundException('Medicine not found in your inventory');

    await this.prisma.medicine.delete({
      where: { id },
    });
    return { success: true };
  }
}
