import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AttractionsService } from './attractions.service';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AttractionDto, AttractionEstadoDto } from '../common/types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attraction, FastPassReservation } from '../entities/entities';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { In } from 'typeorm';

@ApiTags('atracciones')
@Controller()
export class AttractionsController {
  constructor(
    private readonly attractions: AttractionsService,
    @InjectRepository(Attraction) private readonly attrsRepo: Repository<Attraction>,
    @InjectRepository(FastPassReservation)
    private readonly fpRepo: Repository<FastPassReservation>,
  ) {}

  @Get('atracciones')
  findAll(
    @Query('zona') zona?: string,
    @Query('intensidad') intensidad?: string,
    @Query('edadMin') edadMin?: string,
    @Query('q') q?: string,
  ) {
    return this.attractions.findAll({ zona, intensidad, edadMin, q });
  }

  @Get('atracciones/:id')
  findOne(@Param('id') id: string) {
    return this.attractions.findOne(id);
  }

  @Get('atracciones/:id/wait')
  getWait(@Param('id') id: string) {
    return this.attractions.getWait(id);
  }

  @Get('zonas')
  zonas() {
    return this.attractions.zonas();
  }

  // ---------- Admin ----------
  @Post('admin/atracciones')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async create(@Body() dto: AttractionDto) {
    const attr = (await this.attrsRepo.save(
      this.attrsRepo.create({
        id: randomUUID(),
        name: dto.name,
        zona: dto.zona,
        tipo: dto.tipo,
        intensidad: dto.intensidad,
        edadMin: dto.edadMin,
        alturaMinCm: dto.alturaMinCm,
        capacidadCiclo: dto.capacidadCiclo,
        duracionCicloMin: dto.duracionCicloMin,
        puntosPorVisita: dto.puntosPorVisita,
        posX: dto.posX,
        posY: dto.posY,
        descripcion: dto.descripcion,
        colorAcento: dto.colorAcento ?? '#e33d7f',
      } as any),
    )) as unknown as Attraction;
    return this.attractions.findOne(attr.id);
  }

  @Patch('admin/atracciones/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async update(@Param('id') id: string, @Body() dto: AttractionDto) {
    const attr = await this.attrsRepo.findOne({ where: { id } });
    if (!attr) throw new ConflictException('Atracción no encontrada');
    await this.attrsRepo.update(id, {
      name: dto.name,
      zona: dto.zona,
      tipo: dto.tipo,
      intensidad: dto.intensidad,
      edadMin: dto.edadMin,
      alturaMinCm: dto.alturaMinCm,
      capacidadCiclo: dto.capacidadCiclo,
      duracionCicloMin: dto.duracionCicloMin,
      puntosPorVisita: dto.puntosPorVisita,
      posX: dto.posX,
      posY: dto.posY,
      descripcion: dto.descripcion,
      colorAcento: dto.colorAcento ?? '#e33d7f',
    } as any);
    return this.attractions.findOne(id);
  }

  @Delete('admin/atracciones/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async remove(@Param('id') id: string) {
    const reservas = await this.fpRepo.count({
      where: { attractionId: id, estado: In(['pending', 'confirmed']) },
    });
    if (reservas > 0) {
      throw new ConflictException('No se puede eliminar: la atracción tiene reservas activas');
    }
    await this.attrsRepo.delete(id);
    return { ok: true };
  }

  @Patch('admin/atracciones/:id/estado')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  async setEstado(@Param('id') id: string, @Body() dto: AttractionEstadoDto) {
    const attr = await this.attrsRepo.findOne({ where: { id } });
    if (!attr) throw new NotFoundException('Atracción no encontrada');
    await this.attrsRepo.update(id, { estado: dto.estado } as any);

    // Al cerrar: cancelar confirmed futuros (regla estado → cancelled admin_cierre)
    if (dto.estado === 'cerrada') {
      const futuros = await this.fpRepo.find({
        where: { attractionId: id, estado: 'confirmed' },
      });
      for (const fp of futuros) {
        fp.estado = 'cancelled';
        fp.canceladoMotivo = 'admin_cierre';
        await this.fpRepo.save(fp as never);
      }
    }
    return this.attractions.findOne(id);
  }
}
