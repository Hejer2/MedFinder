import { Controller, Get, Post } from '@nestjs/common';
import { SpecialtiesService } from './specialties.service';

@Controller('specialties')
export class SpecialtiesController {
  constructor(private readonly specialtiesService: SpecialtiesService) {}

  @Get()
  findAll() {
    return this.specialtiesService.findAll();
  }

  @Get('top')
  getTop() {
    return this.specialtiesService.getTopSpecialties();
  }



  @Post('seed')
  async seed() {
    return this.specialtiesService.seed();
  }
}
