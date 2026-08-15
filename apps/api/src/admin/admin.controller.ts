import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('kpis')
  kpis() {
    return this.admin.kpis();
  }

  @Get('ocupacion')
  ocupacion(@Query('fecha') fecha?: string) {
    return this.admin.ocupacion(fecha);
  }

  @Get('ventas')
  ventas(@Query('dias') dias?: string) {
    return this.admin.ventas(dias ? Number(dias) : 7);
  }
}
