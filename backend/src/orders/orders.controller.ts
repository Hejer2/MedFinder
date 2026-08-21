import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { isAllowedImageOrPdf } from '../common/upload.utils';

const ALLOWED_PRESCRIPTION_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const ALLOWED_PRESCRIPTION_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('upload-prescription')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safeExt = extname(file.originalname).toLowerCase();
        cb(null, `prescription-${uniqueSuffix}${safeExt}`);
      }
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max
    },
    fileFilter: (req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase();
      if (!ALLOWED_PRESCRIPTION_MIMES.includes(file.mimetype) || !ALLOWED_PRESCRIPTION_EXTS.includes(ext)) {
        return cb(new BadRequestException('Invalid file type. Only JPG, PNG, WEBP, and PDF documents are allowed.'), false);
      }
      cb(null, true);
    }
  }))
  @ApiOperation({ summary: 'Upload doctor prescription photo or document' })
  async uploadPrescription(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('File is required and must be a valid image or PDF (max 5MB)');
    }

    // Verify magic bytes signature on disk
    if (file.path && !isAllowedImageOrPdf(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {}
      throw new BadRequestException('Invalid file content signature. Upload rejected.');
    }

    const url = `/uploads/${file.filename}`;
    return { url };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  create(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, createOrderDto);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pay for an order' })
  pay(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.pay(id, req.user.userId, req.user.role);
  }

  @Get('patient')
  @ApiOperation({ summary: 'Get all orders for the current patient' })
  findAllByPatient(@Request() req: any) {
    return this.ordersService.findAllByPatient(req.user.userId);
  }

  @Get('pharmacy')
  @ApiOperation({ summary: 'Get all orders for the current pharmacy' })
  findAllByPharmacy(@Request() req: any) {
    return this.ordersService.findAllByPharmacy(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status of an order' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    return this.ordersService.updateStatus(id, status, req.user.userId);
  }
}
