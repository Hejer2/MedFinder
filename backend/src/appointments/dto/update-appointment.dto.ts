import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentDto {
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @IsDateString()
  @IsOptional()
  dateTime?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
