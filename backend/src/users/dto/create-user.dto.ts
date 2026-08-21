// backend/src/users/dto/create-user.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { Role } from '../entities/user.entity';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(10, 15)
  phone: string;

  @IsString()
  passwordHash: string; // already hashed before passing to service

  @IsEnum(Role)
  role: Role;
}
