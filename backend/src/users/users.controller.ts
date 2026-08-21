import { Controller, Get, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  findMe(@Request() req) {
    return this.usersService.findMe(req.user.userId);
  }

  @Patch('me')
  updateMe(@Request() req, @Body() data: { name?: string, email?: string, phone?: string, dateOfBirth?: string }) {
    return this.usersService.updateMe(req.user.userId, data);
  }

  @Patch('me/password')
  updatePassword(@Request() req, @Body() data: any) {
    return this.usersService.updatePassword(req.user.userId, data.oldPassword, data.newPassword);
  }

  @Get(':id')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.usersService.findOneProfile(req.user.userId, req.user.role, id);
  }

  @Patch(':id')
  updatePatient(@Request() req: any, @Param('id') id: string, @Body() body: { medicalInfo: any }) {
    return this.usersService.updatePatientInfo(req.user.userId, req.user.role, id, body.medicalInfo);
  }
}
