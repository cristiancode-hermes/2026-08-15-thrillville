import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attraction, Badge, CheckIn, UserBadge } from '../entities/entities';
import type { BadgeView, PuntosView } from '../common/types';
import { NIVELES } from '../common/types';
import { dateInMadrid } from '../common/time';

/**
 * Gamificación — regla F: puntos SIEMPRE derivados de check-ins reales
 * (Σ check-ins × puntosPorVisita), nunca columna arbitraria.
 */
@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(CheckIn) private readonly checkInsRepo: Repository<CheckIn>,
    @InjectRepository(Attraction) private readonly attrsRepo: Repository<Attraction>,
    @InjectRepository(Badge) private readonly badgesRepo: Repository<Badge>,
    @InjectRepository(UserBadge) private readonly userBadgesRepo: Repository<UserBadge>,
  ) {}

  /** Puntos derivados: Σ por atracción (count × puntosPorVisita) */
  async computePuntos(userId: string): Promise<number> {
    const desglose = await this.desglosePuntos(userId);
    return desglose.reduce((acc, d) => acc + d.puntos, 0);
  }

  async desglosePuntos(userId: string): Promise<PuntosView['desglose']> {
    const checkIns = await this.checkInsRepo.find({ where: { userId } });
    const attrs = await this.attrsRepo.find();
    const byAttr = new Map<string, number>();
    for (const c of checkIns) byAttr.set(c.attractionId, (byAttr.get(c.attractionId) ?? 0) + 1);
    return attrs
      .filter((a) => byAttr.has(a.id))
      .map((a) => ({
        atraccionId: a.id,
        atraccionNombre: a.name,
        checkins: byAttr.get(a.id) ?? 0,
        puntos: (byAttr.get(a.id) ?? 0) * a.puntosPorVisita,
      }))
      .sort((x, y) => y.puntos - x.puntos);
  }

  nivel(puntos: number): string {
    let nivel: string = NIVELES[0].nombre;
    for (const n of NIVELES) if (puntos >= n.minimo) nivel = n.nombre;
    return nivel;
  }

  async puntosView(userId: string): Promise<PuntosView> {
    const desglose = await this.desglosePuntos(userId);
    const puntos = desglose.reduce((acc, d) => acc + d.puntos, 0);
    const nivel = this.nivel(puntos);

    let nivelSiguiente: string | null = null;
    let progreso = 100;
    for (let i = 0; i < NIVELES.length; i++) {
      const n = NIVELES[i];
      if (puntos < n.minimo) {
        const anterior = i > 0 ? NIVELES[i - 1].minimo : 0;
        progreso = Math.round(((puntos - anterior) / (n.minimo - anterior)) * 100);
        nivelSiguiente = n.nombre;
        break;
      }
    }

    return { puntos, nivel, nivelSiguiente, progreso, desglose };
  }

  /** Evalúa TODAS las insignias; inserta las nuevas y devuelve la última ganada */
  async evaluateBadges(userId: string): Promise<{ badge: BadgeView; nuevas: BadgeView[] } | null> {
    const [badges, checkIns, ganadas] = await Promise.all([
      this.badgesRepo.find(),
      this.checkInsRepo.find({ where: { userId } }),
      this.userBadgesRepo.find({ where: { userId } }),
    ]);
    const ganadasSet = new Set(ganadas.map((g) => g.badgeId));
    const attrs = await this.attrsRepo.find();
    const byId = new Map(attrs.map((a) => [a.id, a]));

    const zonasVisitadas = new Set(checkIns.map((c) => byId.get(c.attractionId)?.zona).filter(Boolean)).size;
    const atraccionesVisitadas = new Set(checkIns.map((c) => c.attractionId));
    const porDia = new Map<string, number>();
    for (const c of checkIns) {
      const dia = dateInMadrid(c.at);
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
    }
    const maxEnUnDia = Math.max(0, ...Array.from(porDia.values()));

    const nuevas: BadgeView[] = [];
    for (const b of badges) {
      if (ganadasSet.has(b.id)) continue;
      const c = b.criterios ?? {};
      let cumple = false;
      if (c.minCheckins && checkIns.length >= c.minCheckins) cumple = true;
      if (!cumple && c.atracciones && c.atracciones.every((id) => atraccionesVisitadas.has(id))) cumple = true;
      if (!cumple && c.zonasVisitadas && zonasVisitadas >= c.zonasVisitadas) cumple = true;
      if (!cumple && c.checkinsEnUnDia && maxEnUnDia >= c.checkinsEnUnDia) cumple = true;
      if (cumple) {
        await this.userBadgesRepo.save(
          this.userBadgesRepo.create({ userId, badgeId: b.id } as any),
        );
        nuevas.push(this.toView(b, true, new Date()));
      }
    }

    if (nuevas.length === 0) return null;
    return { badge: nuevas[nuevas.length - 1], nuevas };
  }

  async catalogo(userId: string): Promise<BadgeView[]> {
    const [badges, ganadas] = await Promise.all([
      this.badgesRepo.find(),
      this.userBadgesRepo.find({ where: { userId } }),
    ]);
    const ganadasMap = new Map(ganadas.map((g) => [g.badgeId, g]));
    return badges.map((b) => {
      const g = ganadasMap.get(b.id);
      return this.toView(b, !!g, g?.earnedAt ?? null);
    });
  }

  async ganadas(userId: string): Promise<BadgeView[]> {
    const all = await this.catalogo(userId);
    return all.filter((b) => b.ganada);
  }

  async historial(userId: string): Promise<CheckIn[]> {
    const checkIns = await this.checkInsRepo.find({
      where: { userId },
      order: { at: 'DESC' },
    });
    const attrs = await this.attrsRepo.find();
    const byId = new Map(attrs.map((a) => [a.id, a]));
    return checkIns.map((c) => {
      const attr = byId.get(c.attractionId);
      return {
        ...c,
        attraction: attr,
        puntosGanados: attr ? attr.puntosPorVisita : 0,
      } as unknown as CheckIn;
    });
  }

  private toView(b: Badge, ganada: boolean, earnedAt: Date | null): BadgeView {
    return {
      id: b.id,
      codigo: b.codigo,
      nombre: b.nombre,
      descripcion: b.descripcion,
      icono: b.icono,
      criterios: (b.criterios ?? {}) as Record<string, unknown>,
      ganada,
      earnedAt: earnedAt ? earnedAt.toISOString() : null,
    };
  }
}
