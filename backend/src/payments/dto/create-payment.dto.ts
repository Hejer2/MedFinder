import { IsString, IsNotEmpty, IsUUID, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class CreatePaymentDto {
  @IsUUID()
  @IsOptional()
  appointmentId?: string;

  @IsUUID()
  @IsOptional()
  orderId?: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;
}
