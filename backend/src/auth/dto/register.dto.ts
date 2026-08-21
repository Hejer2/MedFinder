// backend/src/auth/dto/register.dto.ts
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Role } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @Length(8, 15)
  phone?: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    { message: 'Password too weak (min 8 chars, upper, lower, number)' })
  password: string;

  @IsEnum(Role)
  role: Role;
}
