import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FastPassService } from './fastpass.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateFastPassDto } from '../common/types';
import type { AuthenticatedUser } from '../common/types';

@ApiTags('fastpass')
@Controller('fastpass')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FastPassController {
  constructor(private readonly fastpass: FastPassService) {}

  @Get('slots')
  slots(@Query('atraccionId') atraccionId: string, @Query('fecha') fecha: string) {
    return this.fastpass.slots(atraccionId, fecha);
  }

  @Post()
  reservar(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFastPassDto) {
    return this.fastpass.reservar(user.id, {
      atraccionId: dto.atraccionId,
      fecha: dto.fecha,
      horaInicio: dto.horaInicio,
    });
  }

  @Post(':id/confirmar')
  confirmar(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.fastpass.confirmar(user.id, id);
  }

  @Post(':id/cancelar')
  cancelar(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.fastpass.cancelar(user.id, id);
  }

  @Post(':id/usar')
  usar(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.fastpass.usar(user.id, id);
  }

  @Post('check-in')
  checkInWalkup(@CurrentUser() user: AuthenticatedUser, @Body() dto: { atraccionId: string }) {
    return this.fastpass.checkInWalkup(user.id, dto.atraccionId);
  }

  @Get('mis-reservas')
  misReservas(@CurrentUser() user: AuthenticatedUser) {
    return this.fastpass.misReservas(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.fastpass.findOne(user.id, id);
  }
}
