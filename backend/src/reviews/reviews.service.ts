import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: string, dto: CreateReviewDto) {
    const completedAppt = await this.prisma.appointment.findFirst({
      where: {
        patientId: patientId,
        doctorId: dto.doctorId,
        status: 'COMPLETED',
      },
    });

    if (!completedAppt) {
      throw new BadRequestException('You can only review a doctor after a completed appointment.');
    }

    const existingReview = await this.prisma.review.findFirst({
      where: {
        patientId: patientId,
        doctorId: dto.doctorId,
      },
    });

    let review;
    if (existingReview) {
      review = await this.prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: dto.rating,
          comment: dto.comment,
        },
      });
    } else {
      review = await this.prisma.review.create({
        data: {
          patientId: patientId,
          doctorId: dto.doctorId,
          rating: dto.rating,
          comment: dto.comment,
        },
      });
    }

    const aggregates = await this.prisma.review.aggregate({
      where: { doctorId: dto.doctorId },
      _avg: { rating: true },
    });

    const newRating = aggregates._avg.rating || 0;

    await this.prisma.doctor.update({
      where: { id: dto.doctorId },
      data: { ratingAverage: newRating },
    });

    return review;
  }

  async findByDoctor(doctorId: string) {
    return this.prisma.review.findMany({
      where: { doctorId: doctorId },
      include: {
        patient: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
