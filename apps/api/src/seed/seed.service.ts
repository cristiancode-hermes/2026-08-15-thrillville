import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Attraction,
  Badge,
  CheckIn,
  FastPassReservation,
  Slot,
  Ticket,
  User,
  UserBadge,
} from '../entities/entities';
import { genRef, sha256Hex } from '../common/util';
import { franjasDelDia, madridDateStr } from '../common/time';

/**
 * Seed idempotente (regla F): los puntos de demo SIEMPRE se derivan de sus
 * check-ins reales (Σ check-ins × puntosPorVisita) — nunca puntos base arbitrarios.
 * El slot.ocupados de los FastPass sembrados refleja las reservas activas reales
 * (consistencia: ocupados == COUNT(pending|confirmed) por slot).
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Attraction) private readonly attrsRepo: Repository<Attraction>,
    @InjectRepository(CheckIn) private readonly checkInsRepo: Repository<CheckIn>,
    @InjectRepository(Ticket) private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(FastPassReservation) private readonly fpRepo: Repository<FastPassReservation>,
    @InjectRepository(Badge) private readonly badgesRepo: Repository<Badge>,
    @InjectRepository(UserBadge) private readonly userBadgesRepo: Repository<UserBadge>,
    @InjectRepository(Slot) private readonly slotsRepo: Repository<Slot>,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_DB !== 'true') return;
    const existing = await this.usersRepo.findOne({ where: { username: 'demo' } });
    if (existing) {
      this.logger.log('Seed: demo user ya existe — skip');
      return;
    }
    await this.seed();
    this.logger.log('Seed complete: 2 usuarios, 6 atracciones, 4 tickets, 2 fastpass, 8 insignias');
  }

  private async seed() {
    const [demo, admin] = await this.seedUsers();
    const attrs = await this.seedAttractions();
    const byId = new Map(attrs.map((a) => [a.id, a]));
    await this.seedCheckIns(demo.id, byId);
    await this.seedTickets(demo.id);
    await this.seedFastPass(demo.id, byId);
    await this.seedBadges(demo.id);
  }

  private async seedUsers(): Promise<[User, User]> {
    const demo = (await this.usersRepo.save(
      this.usersRepo.create({
        id: 'usr-demo',
        username: 'demo',
        email: 'demo@thrillville.dev',
        passwordHash: await bcrypt.hash('demo1234', 10),
        role: 'visitor',
      } as any),
    )) as unknown as User;
    const admin = (await this.usersRepo.save(
      this.usersRepo.create({
        id: 'usr-admin',
        username: 'admin',
        email: 'admin@thrillville.dev',
        passwordHash: await bcrypt.hash('admin1234', 10),
        role: 'admin',
      } as any),
    )) as unknown as User;
    return [demo, admin];
  }

  private async seedAttractions(): Promise<Attraction[]> {
    const data = [
      { id: 'attr-vortex', name: 'Vortex', zona: 'norte', tipo: 'Montaña rusa', intensidad: 4, edadMin: 10, alturaMinCm: 130, capacidadCiclo: 24, duracionCicloMin: 3, puntosPorVisita: 40, posX: 62, posY: 18, colorAcento: '#e33d7f', estado: 'operativa', descripcion: 'La montaña rusa insignia del parque: tres inversiones y una caída de 42 metros.' },
      { id: 'attr-noria', name: 'Noria Panorámica', zona: 'norte', tipo: 'Noria', intensidad: 2, edadMin: 4, alturaMinCm: 0, capacidadCiclo: 8, duracionCicloMin: 10, puntosPorVisita: 25, posX: 80, posY: 32, colorAcento: '#f5a623', estado: 'operativa', descripcion: '30 metros de altura con vistas de todo el parque al atardecer.' },
      { id: 'attr-cometa', name: 'Cometa', zona: 'aventura', tipo: 'Montaña rusa lanzada', intensidad: 5, edadMin: 12, alturaMinCm: 140, capacidadCiclo: 20, duracionCicloMin: 2, puntosPorVisita: 45, posX: 22, posY: 62, colorAcento: '#60a5fa', estado: 'operativa', descripcion: 'Lanzamiento de 0 a 100 km/h en 3 segundos. Solo para valientes.' },
      { id: 'attr-carrousel', name: 'Carrousel Mágico', zona: 'plaza', tipo: 'Familiar', intensidad: 1, edadMin: 0, alturaMinCm: 0, capacidadCiclo: 40, duracionCicloMin: 4, puntosPorVisita: 10, posX: 50, posY: 52, colorAcento: '#34d399', estado: 'operativa', descripcion: 'El clásico carrusel de dos pisos con caballitos de feria.' },
      { id: 'attr-casa-terror', name: 'Casa del Terror', zona: 'plaza', tipo: 'Terror', intensidad: 3, edadMin: 8, alturaMinCm: 0, capacidadCiclo: 30, duracionCicloMin: 6, puntosPorVisita: 30, posX: 34, posY: 72, colorAcento: '#8b5cf6', estado: 'cerrada', descripcion: 'Recorrido oscuro con sustos. Cerrada hoy por mantenimiento.' },
      { id: 'attr-rapidos', name: 'Rápidos del Cañón', zona: 'aventura', tipo: 'Rápidos', intensidad: 4, edadMin: 7, alturaMinCm: 110, capacidadCiclo: 16, duracionCicloMin: 5, puntosPorVisita: 35, posX: 10, posY: 40, colorAcento: '#0ea5e9', estado: 'operativa', descripcion: 'Descenso en balsa por el cañón con remolinos y una cascada final.' },
    ] as const;

    const attrs: Attraction[] = [];
    for (const d of data) {
      const attr = (await this.attrsRepo.save(
        this.attrsRepo.create({ ...d } as any),
      )) as unknown as Attraction;
      attrs.push(attr);
    }
    return attrs;
  }

  /**
   * 10 check-ins hoy (Europe/Madrid), repartidos en las 3 zonas.
   * Los más recientes (últimos 30 min) alimentan el modelo de cola → esperas reales en mapa/lista/detalle.
   * Puntos demo = Σ check-ins × pts = 340 → nivel Aventurero.
   */
  private async seedCheckIns(demoId: string, byId: Map<string, Attraction>) {
    const plan: Array<{ minsAgo: number; attractionId: string; via: 'walkup' | 'fastpass' }> = [
      { minsAgo: 12, attractionId: 'attr-vortex', via: 'walkup' },
      { minsAgo: 20, attractionId: 'attr-cometa', via: 'fastpass' },
      { minsAgo: 26, attractionId: 'attr-vortex', via: 'walkup' },
      { minsAgo: 45, attractionId: 'attr-rapidos', via: 'walkup' },
      { minsAgo: 75, attractionId: 'attr-noria', via: 'walkup' },
      { minsAgo: 105, attractionId: 'attr-carrousel', via: 'walkup' },
      { minsAgo: 155, attractionId: 'attr-cometa', via: 'walkup' },
      { minsAgo: 205, attractionId: 'attr-vortex', via: 'walkup' },
      { minsAgo: 265, attractionId: 'attr-rapidos', via: 'walkup' },
      { minsAgo: 325, attractionId: 'attr-noria', via: 'walkup' },
    ];
    for (const p of plan) {
      void byId.get(p.attractionId);
      await this.checkInsRepo.save(
        this.checkInsRepo.create({
          userId: demoId,
          attractionId: p.attractionId,
          at: new Date(Date.now() - p.minsAgo * 60_000),
          via: p.via,
        } as any),
      );
    }
  }

  private async seedTickets(demoId: string) {
    const hoy = madridDateStr();
    const ayer = new Date(Date.now() - 86_400_000);
    const ayerStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(ayer);

    const tickets = [
      { fechaVisita: hoy, tipo: 'adulto' as const, cantidad: 2, subtotalCents: 6900, ivaCents: 1449, totalCents: 8349 },
      { fechaVisita: hoy, tipo: 'nino' as const, cantidad: 1, subtotalCents: 2200, ivaCents: 462, totalCents: 2662 },
      { fechaVisita: ayerStr, tipo: 'adulto' as const, cantidad: 1, subtotalCents: 3450, ivaCents: 724, totalCents: 4174 },
      { fechaVisita: ayerStr, tipo: 'nino' as const, cantidad: 1, subtotalCents: 2200, ivaCents: 462, totalCents: 2662 },
    ];
    for (const t of tickets) {
      await this.ticketsRepo.save(
        this.ticketsRepo.create({
          userId: demoId,
          fechaVisita: t.fechaVisita,
          tipo: t.tipo,
          cantidad: t.cantidad,
          subtotalCents: t.subtotalCents,
          ivaCents: t.ivaCents,
          totalCents: t.totalCents,
          estado: 'pagado',
          ref: genRef('FV'),
        } as any),
      );
    }
  }

  /** 1 confirmed (vortex 18:00) + 1 pending (cometa 19:00, con cuenta atrás real).
   *  Slots sembrados para hoy y mañana; ocupados == reservas activas por slot. */
  private async seedFastPass(demoId: string, byId: Map<string, Attraction>) {
    const hoy = madridDateStr();
    const manana = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(Date.now() + 86_400_000));

    for (const attr of byId.values()) {
      for (const fecha of [hoy, manana]) {
        for (const horaInicio of franjasDelDia()) {
          const ciclosEnFranja = Math.max(1, Math.min(3, Math.floor(30 / Math.max(1, attr.duracionCicloMin))));
          await this.slotsRepo.save(
            this.slotsRepo.create({
              attractionId: attr.id,
              fecha,
              horaInicio,
              capacidad: attr.capacidadCiclo * ciclosEnFranja,
              ocupados: 0,
            } as any),
          );
        }
      }
    }

    // confirmed — vortex hoy 18:00
    const fp1 = (await this.fpRepo.save(
      this.fpRepo.create({
        userId: demoId,
        attractionId: 'attr-vortex',
        fecha: hoy,
        horaInicio: '18:00',
        estado: 'confirmed',
        expiresAt: new Date(Date.now() + 30 * 60_000),
        qrHash: await sha256Hex(`FP-SEED1:${demoId}:attr-vortex`),
        ref: genRef('FP'),
      } as any),
    )) as unknown as FastPassReservation;
    // pending — cometa hoy 19:00 (cuenta atrás visible; el sweeper lo expira a los 15 min)
    const fp2 = (await this.fpRepo.save(
      this.fpRepo.create({
        userId: demoId,
        attractionId: 'attr-cometa',
        fecha: hoy,
        horaInicio: '19:00',
        estado: 'pending',
        expiresAt: new Date(Date.now() + 15 * 60_000),
        qrHash: await sha256Hex(`FP-SEED2:${demoId}:attr-cometa`),
        ref: genRef('FP'),
      } as any),
    )) as unknown as FastPassReservation;

    // ocupados consistentes: +1 en el slot de cada reserva activa
    for (const fp of [fp1, fp2]) {
      const slot = await this.slotsRepo.findOne({
        where: { attractionId: fp.attractionId, fecha: fp.fecha, horaInicio: fp.horaInicio },
      });
      if (slot) {
        slot.ocupados = 1;
        await this.slotsRepo.save(slot as never);
      }
    }
  }

  private async seedBadges(demoId: string) {
    const badges = [
      { id: 'bdg-primera-vuelta', codigo: 'primera-vuelta', nombre: 'Primera Vuelta', descripcion: 'Haz tu primer check-in en el parque', icono: '🎢', criterios: { minCheckins: 1 } },
      { id: 'bdg-vortex', codigo: 'rey-vortex', nombre: 'Rey del Vortex', descripcion: 'Sube al Vortex, la montaña rusa insignia', icono: '🌀', criterios: { atracciones: ['attr-vortex'] } },
      { id: 'bdg-coleccionista', codigo: 'coleccionista', nombre: 'Coleccionista de Zonas', descripcion: 'Visita las 3 zonas del parque', icono: '🗺️', criterios: { zonasVisitadas: 3 } },
      { id: 'bdg-maratoniano', codigo: 'maratoniano', nombre: 'Maratoniano', descripcion: '5 check-ins en un mismo día', icono: '🔥', criterios: { checkinsEnUnDia: 5 } },
      { id: 'bdg-altura', codigo: 'record-altura', nombre: 'Récord de Altura', descripcion: 'Súbete al Cometa, la atracción más alta', icono: '⛰️', criterios: { atracciones: ['attr-cometa'] } },
      { id: 'bdg-familia', codigo: 'dia-familia', nombre: 'Día en Familia', descripcion: 'Disfruta del Carrousel Mágico', icono: '🎠', criterios: { atracciones: ['attr-carrousel'] } },
      { id: 'bdg-nocturno', codigo: 'fiesta-nocturna', nombre: 'Fiesta Nocturna', descripcion: '3 check-ins en tu visita', icono: '🌙', criterios: { minCheckins: 3 } },
      { id: 'bdg-osado', codigo: 'corazon-valiente', nombre: 'Corazón Valiente', descripcion: 'Atrévete con la Casa del Terror', icono: '💀', criterios: { atracciones: ['attr-casa-terror'] } },
    ];
    for (const b of badges) {
      await this.badgesRepo.save(this.badgesRepo.create(b as any));
    }

    // demo ha ganado 7 de 8 (todas menos Corazón Valiente — la Casa del Terror está cerrada)
    const ganadas = badges.filter((b) => b.id !== 'bdg-osado');
    for (const b of ganadas) {
      await this.userBadgesRepo.save(
        this.userBadgesRepo.create({ userId: demoId, badgeId: b.id, earnedAt: new Date() } as any),
      );
    }
  }
}
