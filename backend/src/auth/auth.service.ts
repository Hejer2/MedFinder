// backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly saltRounds = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /** Register a new user and return JWT pair */
  async register(dto: RegisterDto) {
    const hashed = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: hashed,
      role: dto.role,
    });

    // Send email verification link in background
    const verifyToken = this.jwtService.sign({ email: user.email }, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '24h',
    });
    this.mailService.sendVerificationEmail(user.email, user.name, verifyToken).catch(err => {
      console.error('Failed to send verification email during registration:', err.message);
    });

    const accessToken = this.generateAccessToken(user as any);
    const refreshToken = this.generateRefreshToken(user as any);
    return { accessToken, refreshToken, user };
  }

  /** Validate credentials and return user entity */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  /** Login after validation – issue tokens */
  async login(user: any) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    return { accessToken, refreshToken };
  }

  /** Refresh access token using refresh token */
  async refreshAccessToken(refreshToken: string) {
    if (!refreshToken) throw new BadRequestException('Refresh token missing');
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('REFRESH_SECRET'),
      });
      // payload contains sub (userId)
      const user = await this.usersService.findMe(payload.sub);
      return this.generateAccessToken(user as any);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Password reset link sent' };
    }
    const token = this.jwtService.sign({ sub: user.id, email: user.email }, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '1h',
    });
    await this.mailService.sendPasswordResetEmail(user.email, user.name, token);
    return { message: 'Password reset link sent' };
  }

  async resetPassword(token: string, newPass: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      const hashed = await bcrypt.hash(newPass, this.saltRounds);
      await this.usersService.resetPassword(payload.sub, hashed);
      return { message: 'Password reset successfully' };
    } catch (err) {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      if (payload.email) {
        await this.usersService.verifyUserEmail(payload.email);
      }
      return { message: 'Email verified successfully', isEmailVerified: true };
    } catch (err) {
      throw new BadRequestException('Invalid or expired verification token');
    }
  }

  private generateAccessToken(user: User) {
    const payload = { sub: user.id, role: user.role };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as any,
    });
  }

  private generateRefreshToken(user: User) {
    const payload = { sub: user.id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('REFRESH_EXPIRES_IN') || '7d') as any,
    });
  }
}
