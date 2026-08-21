import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze-symptoms')
  @ApiOperation({ summary: 'Analyze patient symptoms and suggest specialty' })
  async analyzeSymptoms(@Body('symptoms') symptoms: string) {
    if (!symptoms || !symptoms.trim()) {
      throw new BadRequestException('Symptoms text is required');
    }
    return this.aiService.analyzeSymptoms(symptoms);
  }
}
