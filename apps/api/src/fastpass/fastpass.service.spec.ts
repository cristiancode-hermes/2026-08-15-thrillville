import { BadRequestException, ConflictException, GoneException, NotFoundException } from '@nestjs/common';
import { FastPassService } from './fastpass.service';
import { GamificationService } from '../gamification/gamification.service';
import { Attraction, CheckIn, FastPassReservation, Slot } from '../entities/entities';

const attr = (over: Partial<Attraction> = {}): Attraction =>
  ({ id: 'attr-vortex', name: 'Vortex', zona: 'norte', tipo: 'Montaña rusa', intensidad: 4, edadMin: 10, alturaMinCm: 130, capacidadCiclo: 24, duracionCicloMin: 3, puntosPorVisita: 40, estado: 'operativa', posX: 50, posY: 50, descripcion: 'x', colorAcento: '#e33d7f', ...over }) as Attraction;

const fp = (over: Partial<FastPassReservation> = {}): FastPassReservation =>
  ({ id: 1, userId: 'usr-1', attractionId: 'attr-vortex', fecha: '2026-08-15', horaInicio: '18:00', estado: 'pending', expiresAt: new Date(Date.now() + 15 * 60_000), qrHash: 'h', ref: 'FP-ABC123', canceladoMotivo: null, ...over }) as FastPassReservation;

const slot = (over: Partial<Slot> = {}): Slot =>
  ({ id: 1, attractionId: 'attr-vortex', fecha: '2026-08-15', horaInicio: '18:00', capacidad: 24, ocupados: 0, ...over }) as Slot;

describe('FastPassService (ciclo transaccional)', () => {
  let fpRepo: any, slotsRepo: any, attrsRepo: any, checkInsRepo: any, gamification: any;
  let service: FastPassService;

  beforeEach(() => {
    fpRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((f) => f),
      save: jest.fn(async (f) => f),
    };
    slotsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((s) => s),
      save: jest.fn(async (s) => s),
    };
    attrsRepo = { findOne: jest.fn(), find: jest.fn() };
    checkInsRepo = { save: jest.fn(async (c) => c), create: jest.fn((c) => c) };
    gamification = { computePuntos: jest.fn(async () => 40), evaluateBadges: jest.fn(async () => null) };
    service = new FastPassService(fpRepo as any, slotsRepo as any, attrsRepo as any, checkInsRepo as any, gamification as any as GamificationService);
    attrsRepo.findOne.mockResolvedValue(attr());
  });

  it('reservar crea slot si no existe e incrementa ocupados (expiresAt server = now+15min)', async () => {
    slotsRepo.findOne.mockResolvedValue(null); // slot no existe -> se crea
    const res = await service.reservar('usr-1', { atraccionId: 'attr-vortex', fecha: '2026-08-15', horaInicio: '18:00' });
    expect(res.fastpass.estado).toBe('pending');
    const creado = slotsRepo.save.mock.calls[0][0];
    expect(creado.capacidad).toBe(72); // 24 * min(3, floor(30/3)=10) = 24*3
    expect(res.expiresAt).toBeTruthy();
    const expMs = new Date(res.expiresAt).getTime();
    expect(Math.abs(expMs - (Date.now() + 15 * 60_000))).toBeLessThan(5_000);
    expect(res.fastpass.estadoLabel).toBe('Reservada');
  });

  it('reservar sobre slot lleno lanza 409 (doble venta, regla D)', async () => {
    slotsRepo.findOne.mockResolvedValue(slot({ ocupados: 24, capacidad: 24 }));
    slotsRepo.find.mockResolvedValue([slot({ ocupados: 24, capacidad: 24 })]); // para slotsDisponibles
    await expect(service.reservar('usr-1', { atraccionId: 'attr-vortex', fecha: '2026-08-15', horaInicio: '18:00' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('reservar en atracción cerrada lanza 400', async () => {
    attrsRepo.findOne.mockResolvedValue(attr({ estado: 'cerrada' }));
    await expect(service.reservar('usr-1', { atraccionId: 'attr-vortex', fecha: '2026-08-15', horaInicio: '18:00' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('confirmar pending -> confirmed con qrSvg', async () => {
    fpRepo.findOne.mockResolvedValue(fp());
    const res = await service.confirmar('usr-1', 1);
    expect(res.fastpass.estado).toBe('confirmed');
    expect(res.fastpass.estadoLabel).toBe('Confirmada');
    expect(res.qrSvg).toContain('<svg');
    const saved = fpRepo.save.mock.calls[0][0];
    expect(saved.estado).toBe('confirmed');
  });

  it('confirmar expirado lanza 410 Gone', async () => {
    fpRepo.findOne.mockResolvedValue(fp({ expiresAt: new Date(Date.now() - 60_000) }));
    await expect(service.confirmar('usr-1', 1)).rejects.toBeInstanceOf(GoneException);
  });

  it('cancelar pending libera el slot (regla A)', async () => {
    fpRepo.findOne.mockResolvedValue(fp());
    slotsRepo.findOne.mockResolvedValue(slot({ ocupados: 1 }));
    const res = await service.cancelar('usr-1', 1);
    expect(res.fastpass.estado).toBe('cancelled');
    const slotSaved = slotsRepo.save.mock.calls[0][0];
    expect(slotSaved.ocupados).toBe(0);
  });

  it('usar confirmed -> used + check-in + puntos (regla F)', async () => {
    fpRepo.findOne.mockResolvedValue(fp({ estado: 'confirmed' }));
    const res = await service.usar('usr-1', 1);
    expect(res.fastpass.estado).toBe('used');
    expect(res.checkIn.via).toBe('fastpass');
    expect(gamification.computePuntos).toHaveBeenCalledWith('usr-1');
    expect(gamification.evaluateBadges).toHaveBeenCalledWith('usr-1');
  });

  it('expireStale expira pendientes vencidos y libera su slot (regla C)', async () => {
    const vencido = fp({ id: 7, expiresAt: new Date(Date.now() - 60_000) });
    fpRepo.find.mockResolvedValue([vencido]);
    slotsRepo.findOne.mockResolvedValue(slot({ ocupados: 1 }));
    const n = await service.expireStale();
    expect(n).toBe(1);
    expect(fpRepo.save.mock.calls[0][0].estado).toBe('expired');
    expect(slotsRepo.save.mock.calls[0][0].ocupados).toBe(0);
  });

  it('usar con estado pending lanza 400 (primero confirmar)', async () => {
    fpRepo.findOne.mockResolvedValue(fp());
    await expect(service.usar('usr-1', 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findOne de reserva inexistente lanza 404', async () => {
    fpRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('usr-1', 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
