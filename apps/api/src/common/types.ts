import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { FastPassEstado, TicketEstado, TicketTipo, Zona } from '../entities/entities';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: 'visitor' | 'admin';
}

// ---------- Auth ----------
export class RegisterDto {
  @ApiProperty({ example: 'demo' })
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  username: string;

  @ApiProperty({ example: 'demo@thrillville.dev' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  email: string;

  @ApiProperty({ example: 'demo1234', minLength: 6 })
  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'demo', description: 'Usuario o email' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  identifier: string;

  @ApiProperty({ example: 'demo1234' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}

// ---------- Tickets ----------
export class TicketItemDto {
  @ApiProperty({ enum: ['adulto', 'nino'] })
  @IsEnum(['adulto', 'nino'])
  tipo: TicketTipo;

  @ApiProperty({ example: 2, minimum: 1, maximum: 6 })
  @IsInt()
  @Min(1)
  @Max(6)
  cantidad: number;
}

export class CreateTicketDto {
  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  fechaVisita: string;

  @ApiProperty({ type: [TicketItemDto], description: '1–6 items por tipo' })
  @IsArray()
  @IsOptional()
  items: TicketItemDto[];
}

// ---------- FastPass ----------
export class CreateFastPassDto {
  @ApiProperty({ example: 'attr-vortex' })
  @IsString()
  @MaxLength(40)
  atraccionId: string;

  @ApiProperty({ example: '2026-08-16' })
  @IsDateString()
  fecha: string;

  @ApiProperty({ example: '18:00', description: 'Franja de 30 min (HH:MM)' })
  @IsString()
  @MaxLength(5)
  horaInicio: string;
}

// ---------- Admin / Atracciones ----------
export class AttractionDto {
  @ApiProperty({ example: 'Vortex' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @ApiProperty({ enum: ['norte', 'plaza', 'aventura'] })
  @IsEnum(['norte', 'plaza', 'aventura'])
  zona: Zona;

  @ApiProperty({ example: 'Montaña rusa' })
  @IsString()
  @MaxLength(40)
  tipo: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  intensidad: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  edadMin: number;

  @ApiProperty({ example: 130 })
  @IsInt()
  @Min(0)
  alturaMinCm: number;

  @ApiProperty({ example: 24 })
  @IsInt()
  @Min(1)
  capacidadCiclo: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  duracionCicloMin: number;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(0)
  puntosPorVisita: number;

  @ApiProperty({ example: 62 })
  @IsInt()
  @Min(0)
  @Max(100)
  posX: number;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(0)
  @Max(100)
  posY: number;

  @ApiProperty({ example: 'La montaña rusa insignia del parque.' })
  @IsString()
  @MaxLength(400)
  descripcion: string;

  @ApiProperty({ example: '#e33d7f' })
  @IsString()
  @MaxLength(7)
  @IsOptional()
  colorAcento: string;
}

export class AttractionEstadoDto {
  @ApiProperty({ enum: ['operativa', 'saturada', 'cerrada'] })
  @IsEnum(['operativa', 'saturada', 'cerrada'])
  estado: 'operativa' | 'saturada' | 'cerrada';
}

// ---------- Serialized shapes ----------
export interface WaitInfo {
  atraccionId: string;
  waitMinutes: number;
  estado: 'operativa' | 'saturada' | 'cerrada';
  cola: number;
  capacidadCiclo: number;
  duracionCicloMin: number;
  actualizadoEn: string;
}

export interface SlotView {
  id: number;
  horaInicio: string;
  ocupados: number;
  capacidad: number;
  estado: 'libre' | 'con_reservas' | 'lleno';
}

export interface FastPassView {
  id: number;
  atraccionId: string;
  atraccionNombre: string;
  atraccionColor: string;
  zona: Zona;
  fecha: string;
  horaInicio: string;
  estado: FastPassEstado;
  estadoLabel: string;
  expiresAt: string | null;
  ref: string;
  qrHash: string | null;
  canceladoMotivo: string | null;
}

export interface TicketView {
  id: number;
  ref: string;
  fechaVisita: string;
  tipo: TicketTipo;
  tipoLabel: string;
  cantidad: number;
  subtotalCents: number;
  ivaCents: number;
  totalCents: number;
  estado: TicketEstado;
  estadoLabel: string;
  createdAt: string;
}

export interface BadgeView {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  icono: string;
  criterios: Record<string, unknown>;
  ganada: boolean;
  earnedAt: string | null;
}

export interface PuntosView {
  puntos: number;
  nivel: string;
  nivelSiguiente: string | null;
  progreso: number;
  desglose: Array<{ atraccionId: string; atraccionNombre: string; checkins: number; puntos: number }>;
}

export const NIVELES = [
  { nombre: 'Novato', minimo: 0 },
  { nombre: 'Explorador', minimo: 100 },
  { nombre: 'Aventurero', minimo: 250 },
  { nombre: 'Leyenda', minimo: 500 },
  { nombre: 'Mítico', minimo: 1000 },
] as const;

export const ESTADO_FP_LABEL: Record<FastPassEstado, string> = {
  pending: 'Reservada',
  confirmed: 'Confirmada',
  used: 'Usada',
  expired: 'Expirada',
  cancelled: 'Cancelada',
};

export const TIPO_TICKET_LABEL: Record<TicketTipo, string> = {
  adulto: 'Adulto',
  nino: 'Niño',
};

export const ESTADO_TICKET_LABEL: Record<string, string> = {
  pagado: 'Pagado',
  usado: 'Usado',
};
