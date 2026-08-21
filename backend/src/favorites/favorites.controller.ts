import { Controller, Get, Post, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post(':doctorId')
  addFavorite(@Request() req, @Param('doctorId') doctorId: string) {
    return this.favoritesService.addFavorite(req.user.userId, doctorId);
  }

  @Delete(':doctorId')
  removeFavorite(@Request() req, @Param('doctorId') doctorId: string) {
    return this.favoritesService.removeFavorite(req.user.userId, doctorId);
  }

  @Get()
  getFavorites(@Request() req) {
    return this.favoritesService.getFavorites(req.user.userId);
  }
}
