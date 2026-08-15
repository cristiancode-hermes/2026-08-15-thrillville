import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketTipo } from '../entities/entities';
import type { TicketView } from '../common/types';
import { ESTADO_TICKET_LABEL, TIPO_TICKET_LABEL } from '../common/types';
import { genRef } from '../common/util';
import { madridDateStr } from '../common/time';

export interface Precios {
  adulto: number;
  nino: number;
  iva: number;
}

/** Precios actuales (server) — el cliente NUNCA envía precios */
export const PRECIOS: Precios = {
  adulto: 34.5,
  nino: 22.0,
  iva: 21,
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly ticketsRepo: Repository<Ticket>,
  ) {}

  precios(): Precios {
    return PRECIOS;
  }

  async comprar(
    userId: string,
    dto: { fechaVisita: string; items: Array<{ tipo: TicketTipo; cantidad: number }> },
  ): Promise<{ ticket: TicketView; qrSvg: string; total: number }> {
    const items = Array.isArray(dto.items) && dto.items.length ? dto.items : [{ tipo: 'adulto' as TicketTipo, cantidad: 1 }];
    const fecha = dto.fechaVisita || madridDateStr();

    let subtotalCents = 0;
    let personas = 0;
    for (const it of items) {
      const precio = it.tipo === 'nino' ? PRECIOS.nino : PRECIOS.adulto;
      const cantidad = Math.min(6, Math.max(1, Math.round(it.cantidad || 1)));
      subtotalCents += Math.round(precio * 100) * cantidad;
      personas += cantidad;
    }
    const ivaCents = Math.round((subtotalCents * PRECIOS.iva) / 100);
    const totalCents = subtotalCents + ivaCents;

    const ref = genRef('FV');
    const ticket = (await this.ticketsRepo.save(
      this.ticketsRepo.create({
        userId,
        fechaVisita: fecha,
        tipo: items[0].tipo,
        cantidad: personas,
        subtotalCents,
        ivaCents,
        totalCents,
        estado: 'pagado',
        ref,
      } as any),
    )) as unknown as Ticket;

    const view = this.toView(ticket);
    return { ticket: view, qrSvg: this.qrSvg(ref), total: totalCents / 100 };
  }

  async misTickets(userId: string): Promise<TicketView[]> {
    const tickets = await this.ticketsRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return tickets.map((t) => this.toView(t));
  }

  async findOne(userId: string, id: number): Promise<{ ticket: TicketView; qrSvg: string }> {
    const t = await this.ticketsRepo.findOne({ where: { id, userId } });
    if (!t) throw new NotFoundException('Ticket no encontrado');
    return { ticket: this.toView(t), qrSvg: this.qrSvg(t.ref) };
  }

  toView(t: Ticket): TicketView {
    return {
      id: t.id,
      ref: t.ref,
      fechaVisita: t.fechaVisita,
      tipo: t.tipo,
      tipoLabel: TIPO_TICKET_LABEL[t.tipo],
      cantidad: t.cantidad,
      subtotalCents: t.subtotalCents,
      ivaCents: t.ivaCents,
      totalCents: t.totalCents,
      estado: t.estado,
      estadoLabel: ESTADO_TICKET_LABEL[t.estado],
      createdAt: t.createdAt.toISOString(),
    };
  }

  /** QR SVG determinista a partir de la ref — comprobante fuera de la web (regla E) */
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
    const cellsStr = cells.join('');
    const finderCells = Array.from(occupied)
      .map((c) => {
        const [x, y] = c.split(',').map(Number);
        return `<rect x="${x}" y="${y}" width="1" height="1" fill="#0d0b14"/>`;
      })
      .join('');
    return `<svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Código ${ref}"><rect width="21" height="21" fill="#ffffff"/>${finderCells}${cellsStr}</svg>`;
  }
}
