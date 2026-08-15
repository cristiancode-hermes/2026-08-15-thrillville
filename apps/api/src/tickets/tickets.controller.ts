import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTicketDto } from '../common/types';
import type { AuthenticatedUser } from '../common/types';

@ApiTags('tickets')
@Controller()
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('tickets/precios')
  precios() {
    return this.tickets.precios();
  }

  @Post('tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  comprar(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTicketDto) {
    return this.tickets.comprar(user.id, {
      fechaVisita: dto.fechaVisita,
      items: dto.items ?? [],
    });
  }

  @Get('tickets/mis-tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  misTickets(@CurrentUser() user: AuthenticatedUser) {
    return this.tickets.misTickets(user.id);
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseIntPipe) id: number) {
    return this.tickets.findOne(user.id, id);
  }
}
