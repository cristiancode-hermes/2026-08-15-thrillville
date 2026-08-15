/** Formateo Europe/Madrid — nunca hora local del navegador (regla TZ) */
export const TZ = 'Europe/Madrid';

export function madridDateStr(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function madridDatePlus(days: number): string {
  return madridDateStr(new Date(Date.now() + days * 86_400_000));
}

export function formatFecha(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', { timeZone: TZ, day: '2-digit', month: 'short' }).format(d);
}

export function formatFechaLarga(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function formatHora(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-ES', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
}

export function formatEuros(cents: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** Rango de color para esperas: <15 mint, 15–45 amber, >45 danger */
export function waitTone(min: number): 'mint' | 'amber' | 'danger' {
  if (min < 15) return 'mint';
  if (min <= 45) return 'amber';
  return 'danger';
}

export function zonaNombre(zona: string): string {
  const map: Record<string, string> = { norte: 'Zona Norte', plaza: 'Plaza Central', aventura: 'Zona Aventura' };
  return map[zona] ?? zona;
}

export function estadoLabel(estado: string): string {
  const map: Record<string, string> = { operativa: 'Operativa', saturada: 'Saturada', cerrada: 'Cerrada' };
  return map[estado] ?? estado;
}

export function errorMsg(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { error?: { message?: string }; message?: string };
    if (typeof e.error?.message === 'string') return e.error.message;
    if (typeof e.message === 'string') return e.message;
  }
  return 'Ha ocurrido un error inesperado';
}
