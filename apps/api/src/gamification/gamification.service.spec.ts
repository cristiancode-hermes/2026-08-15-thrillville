import { GamificationService } from './gamification.service';
import { Attraction, Badge, CheckIn, UserBadge } from '../entities/entities';

const attr = (over: Partial<Attraction> = {}): Attraction =>
  ({ id: 'a1', name: 'Vortex', zona: 'norte', puntosPorVisita: 40, ...over }) as Attraction;

const checkIn = (over: Partial<CheckIn> = {}): CheckIn =>
  ({ id: 1, userId: 'usr-1', attractionId: 'a1', at: new Date(), via: 'walkup', ...over }) as CheckIn;

describe('GamificationService (regla F: puntos derivados)', () => {
  let checkInsRepo: any, attrsRepo: any, badgesRepo: any, userBadgesRepo: any;
  let service: GamificationService;

  beforeEach(() => {
    checkInsRepo = { find: jest.fn() };
    attrsRepo = { find: jest.fn() };
    badgesRepo = { find: jest.fn() };
    userBadgesRepo = { find: jest.fn(), create: jest.fn((u) => u), save: jest.fn(async (u) => u) };
    service = new GamificationService(checkInsRepo as any, attrsRepo as any, badgesRepo as any, userBadgesRepo as any);
  });

  it('computePuntos = Σ check-ins × puntosPorVisita (nunca columna arbitraria)', async () => {
    checkInsRepo.find.mockResolvedValue([checkIn({ attractionId: 'a1' }), checkIn({ attractionId: 'a1' }), checkIn({ attractionId: 'a2' })]);
    attrsRepo.find.mockResolvedValue([attr(), attr({ id: 'a2', name: 'Noria', zona: 'norte', puntosPorVisita: 25 })]);
    const puntos = await service.computePuntos('usr-1');
    expect(puntos).toBe(105); // 2*40 + 1*25
  });

  it('nivel según umbrales (0 Novato, 100 Explorador, 250 Aventurero, 500 Leyenda, 1000 Mítico)', () => {
    expect(service.nivel(0)).toBe('Novato');
    expect(service.nivel(100)).toBe('Explorador');
    expect(service.nivel(340)).toBe('Aventurero');
    expect(service.nivel(500)).toBe('Leyenda');
    expect(service.nivel(1500)).toBe('Mítico');
  });

  it('puntosView devuelve progreso hacia el siguiente nivel', async () => {
    checkInsRepo.find.mockResolvedValue([checkIn()]);
    attrsRepo.find.mockResolvedValue([attr()]);
    const v = await service.puntosView('usr-1');
    expect(v.puntos).toBe(40);
    expect(v.nivel).toBe('Novato');
    expect(v.nivelSiguiente).toBe('Explorador');
    expect(v.progreso).toBe(40);
    expect(v.desglose[0]).toEqual({ atraccionId: 'a1', atraccionNombre: 'Vortex', checkins: 1, puntos: 40 });
  });

  it('evaluateBadges otorga insignias nuevas y no repite ganadas', async () => {
    badgesRepo.find.mockResolvedValue([
      { id: 'b1', codigo: 'primera', nombre: 'Primera Vuelta', descripcion: 'd', icono: '🎢', criterios: { minCheckins: 1 } },
      { id: 'b2', codigo: 'maraton', nombre: 'Maratoniano', descripcion: 'd', icono: '🔥', criterios: { checkinsEnUnDia: 5 } },
    ]);
    // 6 check-ins hoy (mismo día Madrid) -> maratoniano cumple
    checkInsRepo.find.mockResolvedValue(Array.from({ length: 6 }, () => checkIn()));
    userBadgesRepo.find.mockResolvedValue([{ userId: 'usr-1', badgeId: 'b1' }]); // b1 ya ganada
    attrsRepo.find.mockResolvedValue([attr()]);
    const res = await service.evaluateBadges('usr-1');
    expect(res).not.toBeNull();
    expect(res!.nuevas.map((b) => b.id)).toEqual(['b2']); // solo la nueva
  });

  it('catalogo devuelve todas con flag ganada', async () => {
    badgesRepo.find.mockResolvedValue([{ id: 'b1', codigo: 'x', nombre: 'X', descripcion: 'd', icono: '🏅', criterios: {} }]);
    userBadgesRepo.find.mockResolvedValue([{ userId: 'usr-1', badgeId: 'b1', earnedAt: new Date() }]);
    const cat = await service.catalogo('usr-1');
    expect(cat[0].ganada).toBe(true);
    expect(cat[0].earnedAt).toBeTruthy();
  });
});
