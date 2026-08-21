// backend/src/doctors/dto/create-doctor.dto.ts
import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateDoctorDto {
  @IsUUID()
  userId: string; // linked to a User with role DOCTOR

  @IsUUID()
  specialtyId: string;

  @IsString()
  clinicAddress: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  consultationFee?: number;
}
