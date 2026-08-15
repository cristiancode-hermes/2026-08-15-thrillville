import { NotFoundException } from '@nestjs/common';
import { TicketsService, PRECIOS } from './tickets.service';
import { Ticket } from '../entities/entities';

const makeTicket = (over: Partial<Ticket> = {}): Ticket =>
  ({
    id: 1,
    userId: 'usr-1',
    fechaVisita: '2026-08-16',
    tipo: 'adulto',
    cantidad: 2,
    subtotalCents: 6900,
    ivaCents: 1449,
    totalCents: 8349,
    estado: 'pagado',
    ref: 'FV-ABC123',
    createdAt: new Date(),
    ...over,
  }) as Ticket;

describe('TicketsService', () => {
  let ticketsRepo: { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let service: TicketsService;

  beforeEach(() => {
    ticketsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((t) => t),
      save: jest.fn(async (t) => ({ ...t, createdAt: new Date() })),
    };
    service = new TicketsService(ticketsRepo as any);
  });

  it('precios expone tarifas de servidor', () => {
    expect(service.precios()).toEqual(PRECIOS);
    expect(PRECIOS.adulto).toBe(34.5);
    expect(PRECIOS.iva).toBe(21);
  });

  it('comprar calcula subtotal + IVA 21% en servidor (2 adulto + 1 niño = 110.11 €)', async () => {
    const res = await service.comprar('usr-1', {
      fechaVisita: '2026-08-16',
      items: [
        { tipo: 'adulto', cantidad: 2 },
        { tipo: 'nino', cantidad: 1 },
      ],
    });
    expect(res.ticket.subtotalCents).toBe(9100); // 6900 + 2200
    expect(res.ticket.ivaCents).toBe(1911); // 21% de 9100
    expect(res.ticket.totalCents).toBe(11011);
    expect(res.total).toBe(110.11);
    expect(res.ticket.ref).toMatch(/^FV-/);
    expect(res.qrSvg).toContain('<svg');
  });

  it('comprar sin items usa 1 adulto por defecto', async () => {
    const res = await service.comprar('usr-1', { fechaVisita: '2026-08-16', items: [] });
    expect(res.ticket.cantidad).toBe(1);
    expect(res.ticket.totalCents).toBe(4175); // 3450 + 21% (round(724.5)=725)
  });

  it('comprar limita cantidad a 6 por item', async () => {
    const res = await service.comprar('usr-1', { fechaVisita: '2026-08-16', items: [{ tipo: 'adulto', cantidad: 99 }] });
    expect(res.ticket.cantidad).toBe(6);
  });

  it('misTickets devuelve vistas ordenadas con etiquetas', async () => {
    ticketsRepo.find.mockResolvedValue([makeTicket(), makeTicket({ id: 2, tipo: 'nino', cantidad: 1, estado: 'usado' })]);
    const views = await service.misTickets('usr-1');
    expect(views).toHaveLength(2);
    expect(views[0].tipoLabel).toBe('Adulto');
    expect(views[1].tipoLabel).toBe('Niño');
    expect(views[1].estadoLabel).toBe('Usado');
  });

  it('findOne lanza 404 si el ticket no es del usuario', async () => {
    ticketsRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('usr-1', 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
