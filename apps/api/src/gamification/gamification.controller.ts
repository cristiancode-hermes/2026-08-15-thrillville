import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';

@ApiTags('gamificacion')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  @Get('insignias')
  catalogo(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.catalogo(user.id);
  }

  @Get('me/puntos')
  puntos(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.puntosView(user.id);
  }

  @Get('me/insignias')
  insignias(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.ganadas(user.id);
  }

  @Get('me/check-ins')
  checkIns(@CurrentUser() user: AuthenticatedUser) {
    return this.gamification.historial(user.id);
  }
}
