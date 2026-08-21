import { Controller, Get, Patch, Post, Delete, Body, UseGuards, Req, Param, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { PharmaciesService } from './pharmacies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/entities/user.entity';
import { CreateMedicineDto } from './dto/create-medicine.dto';
import { UpdateMedicineDto } from './dto/update-medicine.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { isAllowedImageOnly } from '../common/upload.utils';

@ApiTags('pharmacies')
@Controller('pharmacies')
export class PharmaciesController {
  constructor(private readonly pharmaciesService: PharmaciesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current pharmacy profile' })
  async getMyProfile(@Req() req: any) {
    return this.pharmaciesService.findByUserId(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current pharmacy profile' })
  async updateMyProfile(@Req() req: any, @Body() dto: any) {
    return this.pharmaciesService.upsertMyProfile(req.user.userId, dto);
  }

  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safeExt = extname(file.originalname).toLowerCase();
        cb(null, `pharmacy-${uniqueSuffix}${safeExt}`);
      }
    }),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB max
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
      const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = extname(file.originalname).toLowerCase();
      if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
        return cb(new BadRequestException('Invalid file type. Only JPG, PNG, and WEBP images are allowed.'), false);
      }
      cb(null, true);
    }
  }))
  @ApiOperation({ summary: 'Upload pharmacy profile photo' })
  async uploadAvatar(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required and must be an image (max 2MB)');
    }

    if (file.path && !isAllowedImageOnly(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {}
      throw new BadRequestException('Invalid file content signature. Upload rejected.');
    }

    const url = `/uploads/${file.filename}`;
    return { url };
  }

  // ---------------------------------------------------------------------
  // Public endpoint – list all pharmacies (no authentication required)
  // ---------------------------------------------------------------------
  @Get()
  @ApiOperation({ summary: 'List all pharmacies' })
  async findAll() {
    return this.pharmaciesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific pharmacy by ID' })
  async findOne(@Param('id') id: string) {
    return this.pharmaciesService.findOne(id);
  }

  // ---------------------------------------------------------------------
  // Medicine Stock Catalog Endpoints
  // ---------------------------------------------------------------------
  @Get(':pharmacyId/medicines')
  @ApiOperation({ summary: 'Get medicines list for a pharmacy' })
  async getMedicines(@Param('pharmacyId') pharmacyId: string) {
    return this.pharmaciesService.getMedicines(pharmacyId);
  }

  @Post('medicines')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PHARMACY, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new medicine' })
  async createMedicine(@Req() req: any, @Body() dto: CreateMedicineDto) {
    return this.pharmaciesService.createMedicine(req.user.userId, dto);
  }

  @Patch('medicines/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PHARMACY, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing medicine' })
  async updateMedicine(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMedicineDto) {
    return this.pharmaciesService.updateMedicine(req.user.userId, id, dto);
  }

  @Delete('medicines/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PHARMACY, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a medicine' })
  async deleteMedicine(@Req() req: any, @Param('id') id: string) {
    return this.pharmaciesService.deleteMedicine(req.user.userId, id);
  }
}
