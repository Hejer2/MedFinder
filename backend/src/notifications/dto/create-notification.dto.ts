import { IsString, IsNotEmpty, IsUUID, IsObject, IsOptional } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsOptional()
  payload?: any;
}
