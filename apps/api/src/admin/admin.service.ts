import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attraction, CheckIn, FastPassReservation, Ticket } from '../entities/entities';
import { WaitService } from '../attractions/wait.service';
import { madridDateStr, timeInMadrid } from '../common/time';

export interface AdminKpis {
  visitantesHoy: number;
  esperaMedia: number;
  fastpassHoy: number;
  ingresosHoyCents: number;
  atraccionesOperativas: number;
  atraccionesTotales: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(CheckIn) private readonly checkInsRepo: Repository<CheckIn>,
    @InjectRepository(Ticket) private readonly ticketsRepo: Repository<Ticket>,
    @InjectRepository(FastPassReservation) private readonly fpRepo: Repository<FastPassReservation>,
    @InjectRepository(Attraction) private readonly attrsRepo: Repository<Attraction>,
    private readonly wait: WaitService,
  ) {}

  async kpis(): Promise<AdminKpis> {
    const hoy = madridDateStr();
    const checkIns = await this.checkInsRepo.find();
    const visitantesHoy = checkIns.filter((c) => timeInMadrid(new Date(c.at)).slice(0, 10) === hoy.slice(0, 10) || new Date(c.at).toISOString().slice(0, 10) === hoy).length;

    const attrs = await this.attrsRepo.find();
    const waits = await Promise.all(attrs.map((a) => this.wait.waitFor(a)));
    const operativas = waits.filter((w) => w.estado !== 'cerrada');
    const esperaMedia = operativas.length
      ? Math.round(operativas.reduce((s, w) => s + w.waitMinutes, 0) / operativas.length)
      : 0;

    const fastpass = await this.fpRepo.find();
    const fastpassHoy = fastpass.filter((f) => f.fecha === hoy).length;

    const tickets = await this.ticketsRepo.find();
    const ingresosHoyCents = tickets
      .filter((t) => t.fechaVisita === hoy && t.estado === 'pagado')
      .reduce((s, t) => s + t.totalCents, 0);

    return {
      visitantesHoy,
      esperaMedia,
      fastpassHoy,
      ingresosHoyCents,
      atraccionesOperativas: operativas.length,
      atraccionesTotales: attrs.length,
    };
  }

  /** Ocupación por hora (hoy) — series con hora + visitantes (gráfico con ejes/tooltips).
   *  Rango 00:00–23:00 (igual que el SQL del spec: date_trunc('hour', at AT TIME ZONE 'Europe/Madrid')). */
  async ocupacion(fecha?: string): Promise<Array<{ hora: string; visitantes: number }>> {
    const hoy = fecha || madridDateStr();
    const checkIns = await this.checkInsRepo.find();
    const porHora = new Map<string, number>();
    for (const c of checkIns) {
      const d = new Date(c.at);
      const dia = d.toISOString().slice(0, 10);
      if (dia !== hoy) continue;
      const hora = timeInMadrid(d).slice(0, 2) + ':00';
      porHora.set(hora, (porHora.get(hora) ?? 0) + 1);
    }
    const horas: string[] = [];
    for (let h = 0; h <= 23; h++) horas.push(`${String(h).padStart(2, '0')}:00`);
    return horas.map((hora) => ({ hora, visitantes: porHora.get(hora) ?? 0 }));
  }

  /** Ventas 7 días — series con fecha + ingresos (gráfico con ejes/tooltips) */
  async ventas(dias = 7): Promise<Array<{ fecha: string; ingresosCents: number; tickets: number }>> {
    const out: Array<{ fecha: string; ingresosCents: number; tickets: number }> = [];
    const hoy = new Date();
    const tickets = await this.ticketsRepo.find();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoy.getTime() - i * 86_400_000);
      const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
      const delDia = tickets.filter((t) => t.fechaVisita === fecha);
      out.push({
        fecha,
        ingresosCents: delDia.reduce((s, t) => s + t.totalCents, 0),
        tickets: delDia.length,
      });
    }
    return out;
  }
}
