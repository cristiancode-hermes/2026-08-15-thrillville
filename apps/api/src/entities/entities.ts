import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export type UserRole = 'visitor' | 'admin';
export type Zona = 'norte' | 'plaza' | 'aventura';
export type AttractionEstado = 'operativa' | 'saturada' | 'cerrada';
export type CheckInVia = 'walkup' | 'fastpass';
export type TicketTipo = 'adulto' | 'nino';
export type TicketEstado = 'pagado' | 'usado';
export type FastPassEstado = 'pending' | 'confirmed' | 'used' | 'expired' | 'cancelled';

export interface BadgeCriteria {
  /** Mínimo de check-ins totales */
  minCheckins?: number;
  /** Check-in en TODAS estas atracciones (ids) */
  atracciones?: string[];
  /** Nº de zonas distintas visitadas */
  zonasVisitadas?: number;
  /** Mínimo de check-ins en un mismo día */
  checkinsEnUnDia?: number;
}

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ unique: true, length: 40 })
  username: string;

  @Column({ unique: true, length: 120 })
  email: string;

  @Exclude()
  @Column({ length: 200 })
  passwordHash: string;

  @Column({ default: 'visitor' })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('attractions')
export class Attraction {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ length: 80 })
  name: string;

  @Column()
  zona: Zona;

  @Column({ length: 40 })
  tipo: string;

  /** 1–5 estrellas */
  @Column({ type: 'integer' })
  intensidad: number;

  @Column({ type: 'integer' })
  edadMin: number;

  /** 0 si no aplica */
  @Column({ type: 'integer' })
  alturaMinCm: number;

  /** personas por ciclo */
  @Column({ type: 'integer' })
  capacidadCiclo: number;

  /** minutos por ciclo */
  @Column({ type: 'integer' })
  duracionCicloMin: number;

  /** base de puntos por check-in (regla F) */
  @Column({ type: 'integer' })
  puntosPorVisita: number;

  @Column({ default: 'operativa' })
  estado: AttractionEstado;

  /** coordenadas del mapa (grid 0–100) */
  @Column({ type: 'integer' })
  posX: number;

  @Column({ type: 'integer' })
  posY: number;

  @Column({ type: 'text' })
  descripcion: string;

  /** hex para pin / personalidad */
  @Column({ length: 7, default: '#e33d7f' })
  colorAcento: string;
}

@Entity('check_ins')
@Index(['userId', 'at'])
@Index(['attractionId', 'at'])
export class CheckIn {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  userId: string;

  @Column({ length: 40 })
  attractionId: string;

  /** TZ Europe/Madrid (guardado como UTC, formateado en servidor) */
  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  at: Date;

  @Column({ default: 'walkup' })
  via: CheckInVia;

  @ManyToOne(() => Attraction, { eager: false })
  @JoinColumn({ name: 'attractionId' })
  attraction?: Attraction;
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  userId: string;

  /** fecha de visita 'YYYY-MM-DD' (Europe/Madrid) */
  @Column({ length: 10 })
  fechaVisita: string;

  @Column()
  tipo: TicketTipo;

  /** 1–6 */
  @Column({ type: 'integer' })
  cantidad: number;

  /** siempre calculado en servidor */
  @Column({ type: 'integer' })
  subtotalCents: number;

  @Column({ type: 'integer' })
  ivaCents: number;

  @Column({ type: 'integer' })
  totalCents: number;

  @Column({ default: 'pagado' })
  estado: TicketEstado;

  /** FV-XXXXXX */
  @Column({ length: 10 })
  ref: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('fastpass_reservations')
@Index(['userId'])
@Index(['attractionId', 'fecha'])
export class FastPassReservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  userId: string;

  @Column({ length: 40 })
  attractionId: string;

  /** 'YYYY-MM-DD' */
  @Column({ length: 10 })
  fecha: string;

  /** 'HH:MM' — franja de 30 min */
  @Column({ length: 5 })
  horaInicio: string;

  @Column({ default: 'pending' })
  estado: FastPassEstado;

  /** calculado EN SERVIDOR = now + 15 min (regla B) */
  @Column({ type: 'datetime' })
  expiresAt: Date;

  /** sha256(id + userId + ref) */
  @Column({ length: 64, nullable: true })
  qrHash: string;

  /** FP-XXXXXX */
  @Column({ length: 10 })
  ref: string;

  @Column({ length: 40, nullable: true })
  canceladoMotivo: string;

  @ManyToOne(() => Attraction, { eager: false })
  @JoinColumn({ name: 'attractionId' })
  attraction?: Attraction;
}

@Entity('badges')
export class Badge {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ unique: true, length: 40 })
  codigo: string;

  @Column({ length: 60 })
  nombre: string;

  @Column({ length: 160 })
  descripcion: string;

  @Column({ length: 30, default: '🏅' })
  icono: string;

  /** JSONB en Neon / simple-json en SQLite — criterios de desbloqueo */
  @Column({ type: 'simple-json' })
  criterios: BadgeCriteria;
}

@Entity('user_badges')
export class UserBadge {
  @PrimaryColumn({ length: 40 })
  userId: string;

  @PrimaryColumn({ length: 40 })
  badgeId: string;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  earnedAt: Date;
}

@Entity('slots')
@Unique(['attractionId', 'fecha', 'horaInicio'])
export class Slot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 40 })
  attractionId: string;

  /** 'YYYY-MM-DD' */
  @Column({ length: 10 })
  fecha: string;

  /** 'HH:MM' — franjas de 30 min 10:00–22:30 */
  @Column({ length: 5 })
  horaInicio: string;

  /** capacidadCiclo × ciclos en franja (máx 3 ciclos) */
  @Column({ type: 'integer' })
  capacidad: number;

  /** contador transaccional (incrementado/liberado bajo mutex) */
  @Column({ type: 'integer', default: 0 })
  ocupados: number;
}
