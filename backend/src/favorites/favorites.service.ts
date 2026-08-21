import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async addFavorite(userId: string, doctorId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { patientId_doctorId: { patientId: userId, doctorId: doctorId } },
    });
    if (existing) throw new ConflictException('Already in favorites');

    return this.prisma.favorite.create({
      data: { patientId: userId, doctorId: doctorId },
    });
  }

  async removeFavorite(userId: string, doctorId: string) {
    return this.prisma.favorite.delete({
      where: { patientId_doctorId: { patientId: userId, doctorId: doctorId } },
    });
  }

  async getFavorites(userId: string) {
    return this.prisma.favorite.findMany({
      where: { patientId: userId },
      include: {
        doctor: {
          include: {
            user: { select: { name: true } },
            specialty: true,
          }
        }
      }
    });
  }
}
