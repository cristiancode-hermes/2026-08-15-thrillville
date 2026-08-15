/**
 * Helpers de tiempo — SIEMPRE Europe/Madrid (TZ del negocio).
 * El navegador/cliente nunca define horas; el servidor formatea.
 */

export const TZ = 'Europe/Madrid';

/** Fecha actual 'YYYY-MM-DD' en Europe/Madrid */
export function madridDateStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Hora actual 'HH:MM' en Europe/Madrid */
export function madridTimeStr(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

/** Fecha + hora legible ISO con offset (para expiresAt / actualizadoEn) */
export function madridIso(now: Date = new Date()): string {
  return now.toISOString();
}

/** 'YYYY-MM-DD' en Europe/Madrid a partir de un Date UTC almacenado */
export function dateInMadrid(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/** Hora 'HH:MM' en Europe/Madrid a partir de un Date UTC almacenado */
export function timeInMadrid(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/** Suma N minutos a una hora 'HH:MM' → 'HH:MM' */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/** Franjas FastPass: 10:00–22:30 cada 30 min */
export function franjasDelDia(): string[] {
  const out: string[] = [];
  for (let h = 10; h <= 22; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 22) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
}
