export interface User {
  id: string;
  username: string;
  email: string;
  role: 'visitor' | 'admin';
}

export type Zona = 'norte' | 'plaza' | 'aventura';
export type AttractionEstado = 'operativa' | 'saturada' | 'cerrada';

export interface WaitInfo {
  atraccionId: string;
  waitMinutes: number;
  estado: AttractionEstado;
  cola: number;
  capacidadCiclo: number;
  duracionCicloMin: number;
  actualizadoEn: string;
}

export interface Attraction {
  id: string;
  name: string;
  zona: Zona;
  tipo: string;
  intensidad: number;
  edadMin: number;
  alturaMinCm: number;
  capacidadCiclo: number;
  duracionCicloMin: number;
  puntosPorVisita: number;
  estado: AttractionEstado;
  posX: number;
  posY: number;
  descripcion: string;
  colorAcento: string;
  wait?: WaitInfo | null;
}

export interface ZonaInfo {
  zona: Zona;
  nombre: string;
  count: number;
}

export interface Precios {
  adulto: number;
  nino: number;
  iva: number;
}

export interface TicketView {
  id: number;
  ref: string;
  fechaVisita: string;
  tipo: 'adulto' | 'nino';
  tipoLabel: string;
  cantidad: number;
  subtotalCents: number;
  ivaCents: number;
  totalCents: number;
  estado: 'pagado' | 'usado';
  estadoLabel: string;
  createdAt: string;
}

export type FastPassEstado = 'pending' | 'confirmed' | 'used' | 'expired' | 'cancelled';

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

export interface CheckInView {
  id: number;
  userId: string;
  attractionId: string;
  at: string;
  via: 'walkup' | 'fastpass';
  attraction?: Attraction | null;
  puntosGanados?: number;
}

export interface AdminKpis {
  visitantesHoy: number;
  esperaMedia: number;
  fastpassHoy: number;
  ingresosHoyCents: number;
  atraccionesOperativas: number;
  atraccionesTotales: number;
}

export interface OcupacionPoint {
  hora: string;
  visitantes: number;
}

export interface VentasPoint {
  fecha: string;
  ingresosCents: number;
  tickets: number;
}
