import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Request() req: any, @Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(req.user.userId, createAppointmentDto);
  }

  @Get()
  findAll(@Request() req: any) {
    if (req.user.role === 'DOCTOR') {
      return this.appointmentsService.findAllByDoctor(req.user.userId);
    }
    return this.appointmentsService.findAllByPatient(req.user.userId);
  }

  @Get('patient')
  findAllByPatient(@Request() req: any) {
    return this.appointmentsService.findAllByPatient(req.user.userId);
  }

  @Get('doctor')
  findAllByDoctor(@Request() req: any) {
    return this.appointmentsService.findAllByDoctor(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.appointmentsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string, @Request() req: any) {
    return this.appointmentsService.updateStatus(id, status, req.user.userId, req.user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto, @Request() req: any) {
    return this.appointmentsService.update(id, updateAppointmentDto, req.user.userId, req.user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.appointmentsService.remove(id, req.user.userId, req.user.role);
  }
}
