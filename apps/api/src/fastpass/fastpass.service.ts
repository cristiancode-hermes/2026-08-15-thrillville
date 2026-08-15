import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Attraction, CheckIn, FastPassReservation, Slot } from '../entities/entities';
import type { FastPassEstado, Zona } from '../entities/entities';
import type { FastPassView, SlotView } from '../common/types';
import { ESTADO_FP_LABEL } from '../common/types';
import { genRef, sha256Hex, withLock } from '../common/util';
import { franjasDelDia, madridDateStr, madridTimeStr } from '../common/time';
import { GamificationService } from '../gamification/gamification.service';

/** Retención: 15 minutos — calculada EN SERVIDOR (regla B) */
const RETENCION_MIN = 15;

@Injectable()
export class FastPassService implements OnModuleInit {
  private sweeperTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(FastPassReservation) private readonly fpRepo: Repository<FastPassReservation>,
    @InjectRepository(Slot) private readonly slotsRepo: Repository<Slot>,
    @InjectRepository(Attraction) private readonly attrsRepo: Repository<Attraction>,
    @InjectRepository(CheckIn) private readonly checkInsRepo: Repository<CheckIn>,
    private readonly gamification: GamificationService,
  ) {}

  /** Arranca el sweeper (regla C): libera pendientes vencidos cada 30s */
  onModuleInit() {
    void this.expireStale();
    this.sweeperTimer = setInterval(() => {
      void this.expireStale();
    }, 30_000);
  }

  async onModuleDestroy() {
    if (this.sweeperTimer) clearInterval(this.sweeperTimer);
  }

  /** Slots de una atracción/fecha — misma query que la reserva (consistencia) */
  async slots(atraccionId: string, fecha: string): Promise<SlotView[]> {
    const attr = await this.attrsRepo.findOne({ where: { id: atraccionId } });
    if (!attr) throw new NotFoundException('Atracción no encontrada');

    const slots = await this.slotsRepo.find({ where: { attractionId: atraccionId, fecha } });
    const porHora = new Map(slots.map((s) => [s.horaInicio, s]));

    const hoy = madridDateStr();
    const horaAhora = madridTimeStr();

    return franjasDelDia().map((hora) => {
      const s = porHora.get(hora);
      const ocupados = s?.ocupados ?? 0;
      const capacidad = s?.capacidad ?? 0;
      let estado: SlotView['estado'] = 'libre';
      if (capacidad > 0 && ocupados >= capacidad) estado = 'lleno';
      else if (ocupados > 0) estado = 'con_reservas';
      // pasadas: marcadas como lleno (no reservables) si la franja ya empezó
      const pasada = fecha === hoy && hora <= horaAhora;
      if (pasada) estado = 'lleno';
      return {
        id: s?.id ?? 0,
        horaInicio: hora,
        ocupados: pasada ? capacidad : ocupados,
        capacidad,
        estado,
      };
    });
  }

  /**
   * Crear retención — ciclo transaccional (reglas A–F):
   * mutex + chequeo de ocupados + 409 si lleno. expiresAt = now + 15 min EN SERVIDOR.
   */
  async reservar(userId: string, dto: { atraccionId: string; fecha: string; horaInicio: string }) {
    const attr = await this.attrsRepo.findOne({ where: { id: dto.atraccionId } });
    if (!attr) throw new NotFoundException('Atracción no encontrada');
    if (attr.estado === 'cerrada') {
      throw new BadRequestException('Esta atracción está cerrada hoy');
    }

    return withLock(async () => {
      let slot = await this.slotsRepo.findOne({
        where: { attractionId: dto.atraccionId, fecha: dto.fecha, horaInicio: dto.horaInicio },
      });

      // Crear el slot si no existe (franja nueva)
      if (!slot) {
        const ciclosEnFranja = Math.max(1, Math.min(3, Math.floor(30 / Math.max(1, attr.duracionCicloMin))));
        slot = (await this.slotsRepo.save(
          this.slotsRepo.create({
            attractionId: dto.atraccionId,
            fecha: dto.fecha,
            horaInicio: dto.horaInicio,
            capacidad: attr.capacidadCiclo * ciclosEnFranja,
            ocupados: 0,
          } as any),
        )) as unknown as Slot;
      }

      if (slot.ocupados >= slot.capacidad) {
        const disponibles = (await this.slots(dto.atraccionId, dto.fecha))
          .filter((s) => s.estado !== 'lleno')
          .map((s) => s.horaInicio);
        throw new ConflictException({
          message: 'Este horario acaba de llenarse. Elige otro slot.',
          slotsDisponibles: disponibles,
        } as never);
      }

      // Mutex serializa: incrementar ocupados + insertar pending en una unidad
      slot.ocupados += 1;
      await this.slotsRepo.save(slot as never);

      const ref = genRef('FP');
      const expiresAt = new Date(Date.now() + RETENCION_MIN * 60_000);
      const qrHash = await sha256Hex(`${ref}:${userId}:${dto.atraccionId}`);

      const fp = (await this.fpRepo.save(
        this.fpRepo.create({
          userId,
          attractionId: dto.atraccionId,
          fecha: dto.fecha,
          horaInicio: dto.horaInicio,
          estado: 'pending',
          expiresAt,
          qrHash,
          ref,
        } as any),
      )) as unknown as FastPassReservation;

      return {
        fastpass: await this.toView(fp),
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  /** Confirmar antes de expirar; si venció → 410 Gone (el sweeper lo libera) */
  async confirmar(userId: string, id: number) {
    const fp = await this.own(userId, id);
    if (fp.estado === 'expired') throw new GoneException('Esta reserva expiró. Reserva otro horario.');
    if (fp.estado === 'cancelled') throw new BadRequestException('Esta reserva fue cancelada');
    if (fp.estado === 'used') throw new BadRequestException('Esta reserva ya fue usada');
    if (fp.estado === 'confirmed') {
      return { fastpass: await this.toView(fp), qrSvg: this.qrSvg(fp.ref) };
    }

    if (new Date(fp.expiresAt).getTime() < Date.now()) {
      fp.estado = 'expired';
      await this.fpRepo.save(fp as never);
      await this.liberarSlot(fp);
      throw new GoneException('Esta reserva expiró. Reserva otro horario.');
    }

    fp.estado = 'confirmed';
    await this.fpRepo.save(fp as never);
    return { fastpass: await this.toView(fp), qrSvg: this.qrSvg(fp.ref) };
  }

  /** Cancelar → liberar slot (regla A: el ciclo cierra con estado real) */
  async cancelar(userId: string, id: number) {
    const fp = await this.own(userId, id);
    if (fp.estado === 'used' || fp.estado === 'expired') {
      throw new BadRequestException('Esta reserva ya no puede cancelarse');
    }
    if (fp.estado === 'cancelled') {
      return { fastpass: await this.toView(fp) };
    }
    const eraPending = fp.estado === 'pending';
    fp.estado = 'cancelled';
    fp.canceladoMotivo = 'usuario';
    await this.fpRepo.save(fp as never);
    if (eraPending) await this.liberarSlot(fp);
    return { fastpass: await this.toView(fp) };
  }

  /** Usar en la atracción: confirmed → used + check-in + puntos + insignias */
  async usar(userId: string, id: number) {
    const fp = await this.own(userId, id);
    if (fp.estado !== 'confirmed') {
      throw new BadRequestException(
        fp.estado === 'used'
          ? 'Este FastPass ya fue usado'
          : fp.estado === 'pending'
            ? 'Primero confirma tu FastPass'
            : 'Este FastPass no está activo',
      );
    }
    const attr = await this.attrsRepo.findOne({ where: { id: fp.attractionId } });
    if (!attr) throw new NotFoundException('Atracción no encontrada');
    if (attr.estado === 'cerrada') throw new BadRequestException('La atracción está cerrada');

    fp.estado = 'used';
    await this.fpRepo.save(fp as never);

    const checkIn = (await this.checkInsRepo.save(
      this.checkInsRepo.create({
        userId,
        attractionId: fp.attractionId,
        at: new Date(),
        via: 'fastpass',
      } as any),
    )) as unknown as CheckIn;

    const puntos = await this.gamification.computePuntos(userId);
    const nuevaInsignia = await this.gamification.evaluateBadges(userId);

    return {
      fastpass: await this.toView(fp),
      checkIn,
      puntos,
      nuevaInsignia,
    };
  }

  /** Check-in walkup (subir sin FastPass) */
  async checkInWalkup(userId: string, atraccionId: string) {
    const attr = await this.attrsRepo.findOne({ where: { id: atraccionId } });
    if (!attr) throw new NotFoundException('Atracción no encontrada');
    if (attr.estado === 'cerrada') throw new BadRequestException('La atracción está cerrada');

    const checkIn = (await this.checkInsRepo.save(
      this.checkInsRepo.create({
        userId,
        attractionId: atraccionId,
        at: new Date(),
        via: 'walkup',
      } as any),
    )) as unknown as CheckIn;

    const puntos = await this.gamification.computePuntos(userId);
    const nuevaInsignia = await this.gamification.evaluateBadges(userId);

    return { checkIn, puntos, nuevaInsignia };
  }

  async misReservas(userId: string): Promise<FastPassView[]> {
    const fps = await this.fpRepo.find({
      where: { userId },
      order: { id: 'DESC' },
    });
    return Promise.all(fps.map((fp) => this.toView(fp)));
  }

  async findOne(userId: string, id: number): Promise<{ fastpass: FastPassView; qrSvg: string }> {
    const fp = await this.own(userId, id);
    return { fastpass: await this.toView(fp), qrSvg: this.qrSvg(fp.ref) };
  }

  /**
   * Sweeper (regla C): expira pendientes vencidos SIN esperar requests
   * y libera su slot. Se ejecuta cada 30s desde onModuleInit.
   */
  async expireStale(): Promise<number> {
    return withLock(async () => {
      const vencidos = await this.fpRepo.find({
        where: { estado: 'pending', expiresAt: LessThan(new Date()) },
      });
      for (const fp of vencidos) {
        fp.estado = 'expired';
        await this.fpRepo.save(fp as never);
        await this.liberarSlot(fp);
      }
      return vencidos.length;
    });
  }

  private async liberarSlot(fp: FastPassReservation) {
    const slot = await this.slotsRepo.findOne({
      where: { attractionId: fp.attractionId, fecha: fp.fecha, horaInicio: fp.horaInicio },
    });
    if (slot && slot.ocupados > 0) {
      slot.ocupados -= 1;
      await this.slotsRepo.save(slot as never);
    }
  }

  private async own(userId: string, id: number): Promise<FastPassReservation> {
    const fp = await this.fpRepo.findOne({ where: { id, userId } });
    if (!fp) throw new NotFoundException('Reserva no encontrada');
    return fp;
  }

  private async toView(fp: FastPassReservation): Promise<FastPassView> {
    const attr = await this.attrsRepo.findOne({ where: { id: fp.attractionId } });
    return {
      id: fp.id,
      atraccionId: fp.attractionId,
      atraccionNombre: attr?.name ?? 'Atracción',
      atraccionColor: attr?.colorAcento ?? '#e33d7f',
      zona: (attr?.zona ?? 'plaza') as Zona,
      fecha: fp.fecha,
      horaInicio: fp.horaInicio,
      estado: fp.estado as FastPassEstado,
      estadoLabel: ESTADO_FP_LABEL[fp.estado as FastPassEstado],
      expiresAt: fp.expiresAt ? fp.expiresAt.toISOString() : null,
      ref: fp.ref,
      qrHash: fp.qrHash,
      canceladoMotivo: fp.canceladoMotivo,
    };
  }

  qrSvg(ref: string): string {
    let seed = 0;
    for (let i = 0; i < ref.length; i++) seed = (seed * 31 + ref.charCodeAt(i)) >>> 0;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const size = 21;
    const cells: string[] = [];
    const occupied = new Set<string>();
    const add = (x: number, y: number) => occupied.add(`${x},${y}`);
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++)
        for (let x = 0; x < 7; x++) {
          const border = x === 0 || y === 0 || x === 6 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          if (border || core) add(ox + x, oy + y);
        }
    };
    finder(0, 0);
    finder(size - 7, 0);
    finder(0, size - 7);
    for (let i = 8; i < size - 8; i++) {
      if (i % 2 === 0) {
        add(i, 6);
        add(6, i);
      }
    }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        if (occupied.has(`${x},${y}`)) continue;
        if (rand() > 0.48) cells.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="#0d0b14"/>`);
      }
    const finderCells = Array.from(occupied)
      .map((c) => {
        const [x, y] = c.split(',').map(Number);
        return `<rect x="${x}" y="${y}" width="1" height="1" fill="#0d0b14"/>`;
      })
      .join('');
    return `<svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Código ${ref}"><rect width="21" height="21" fill="#ffffff"/>${finderCells}${cells.join('')}</svg>`;
  }
}
