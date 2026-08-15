import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Attraction, CheckIn } from '../entities/entities';
import type { WaitInfo } from '../common/types';
import { madridIso } from '../common/time';

/**
 * Modelo de cola (fuente única de esperas — regla #2):
 *   cola        = check-ins en los últimos 30 min × factor de afluencia (5)
 *   ciclos      = ceil(cola / capacidadCiclo)
 *   waitMinutes = ciclos × duracionCicloMin
 *   estado      = cerrada si la atracción está cerrada; saturada si wait > 45; si no operativa
 * Lista, mapa y detalle llaman SIEMPRE a este mismo servicio → mismos números.
 */
const VENTANA_MIN = 30;
const AFluencia = 5;
const SATURADO_MIN = 45;

@Injectable()
export class WaitService {
  constructor(
    @InjectRepository(CheckIn) private readonly checkInsRepo: Repository<CheckIn>,
  ) {}

  async waitFor(attr: Attraction): Promise<WaitInfo> {
    const desde = new Date(Date.now() - VENTANA_MIN * 60_000);
    const recientes = await this.checkInsRepo.count({
      where: { attractionId: attr.id, at: MoreThanOrEqual(desde) },
    });

    const cola = recientes * AFluencia;
    const ciclos = Math.max(1, Math.ceil(cola / Math.max(1, attr.capacidadCiclo)));
    const waitMinutes = ciclos * attr.duracionCicloMin;

    let estado: WaitInfo['estado'] = 'operativa';
    if (attr.estado === 'cerrada') estado = 'cerrada';
    else if (waitMinutes > SATURADO_MIN) estado = 'saturada';

    return {
      atraccionId: attr.id,
      waitMinutes,
      estado,
      cola,
      capacidadCiclo: attr.capacidadCiclo,
      duracionCicloMin: attr.duracionCicloMin,
      actualizadoEn: madridIso(),
    };
  }

  /** esperas de todas las atracciones (para lista y mapa) — misma fuente */
  async waitsForAll(): Promise<Record<string, WaitInfo>> {
    const attrs = await this.checkInsRepo.manager.find(Attraction);
    const out: Record<string, WaitInfo> = {};
    for (const a of attrs) {
      out[a.id] = await this.waitFor(a);
    }
    return out;
  }
}
