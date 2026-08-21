import { IsNotEmpty, IsUUID, IsDateString } from 'class-validator';

export class CreateAvailabilityDto {
  @IsUUID()
  @IsNotEmpty()
  doctorId: string;

  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;
}
