// backend/src/doctors/doctors.controller.ts
import { Controller, Get, Param, Patch, Body, Query, UseGuards, Req } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  /** Get current doctor's own profile */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current doctor profile (self)' })
  async getMyProfile(@Req() req: any) {
    return this.doctorsService.findByUserId(req.user.userId);
  }

  /** Update current doctor's own profile */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current doctor profile (self)' })
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.upsertMyProfile(req.user.userId, dto);
  }

  /** Public endpoint – search doctors with optional filters */
  @Get()
  @ApiOperation({ summary: 'Search / list doctors with filters' })
  async findAll(@Query() filters: any) {
    return this.doctorsService.findAll(filters);
  }

  /** Public endpoint – doctor profile detail */
  @Get(':id')
  @ApiOperation({ summary: 'Get doctor profile by id' })
  async findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }

  /** Get available slots for booking */
  @Get(':id/slots')
  @ApiOperation({ summary: 'Get doctor available slots for a given date' })
  async getSlots(@Param('id') id: string, @Query('date') date: string) {
    return this.doctorsService.getAvailableSlots(id, date);
  }

  /** Doctor can update own profile – protected */
  @Patch(':id/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Update doctor profile (doctor or admin)' })
  async updateProfile(@Param('id') id: string, @Body() dto: UpdateDoctorDto, @Req() req: any) {
    return this.doctorsService.updateProfile(id, dto, req.user.userId, req.user.role);
  }
}
