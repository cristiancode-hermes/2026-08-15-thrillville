import { WaitService } from './wait.service';
import { Attraction, CheckIn } from '../entities/entities';

const attr = (over: Partial<Attraction> = {}): Attraction =>
  ({ id: 'a1', name: 'Vortex', zona: 'norte', capacidadCiclo: 24, duracionCicloMin: 3, estado: 'operativa', ...over }) as Attraction;

describe('WaitService (fuente única de esperas)', () => {
  let checkInsRepo: { count: jest.Mock; manager: { find: jest.Mock } };
  let service: WaitService;

  beforeEach(() => {
    checkInsRepo = {
      count: jest.fn(),
      manager: { find: jest.fn() },
    };
    service = new WaitService(checkInsRepo as any);
  });

  it('waitFor modela la cola: ciclos = ceil(cola/capacidad) × duración', async () => {
    checkInsRepo.count.mockResolvedValue(10); // 10 check-ins recientes -> cola 50
    const w = await service.waitFor(attr());
    expect(w.cola).toBe(50); // 10 * factor 5
    expect(w.waitMinutes).toBe(9); // ceil(50/24)=3 ciclos × 3 min
    expect(w.estado).toBe('operativa');
    expect(w.actualizadoEn).toBeTruthy();
  });

  it('waitFor devuelve cerrada si la atracción está cerrada', async () => {
    checkInsRepo.count.mockResolvedValue(0);
    const w = await service.waitFor(attr({ estado: 'cerrada' }));
    expect(w.estado).toBe('cerrada');
  });

  it('waitFor marca saturada si la espera supera 45 min', async () => {
    checkInsRepo.count.mockResolvedValue(200); // cola 1000 -> ciclos 42 -> 126 min
    const w = await service.waitFor(attr({ duracionCicloMin: 5, capacidadCiclo: 10 }));
    expect(w.waitMinutes).toBeGreaterThan(45);
    expect(w.estado).toBe('saturada');
  });

  it('waitsForAll devuelve mapa con misma fuente para todas', async () => {
    checkInsRepo.manager.find.mockResolvedValue([attr({ id: 'a1' }), attr({ id: 'a2', name: 'Noria' })]);
    checkInsRepo.count.mockResolvedValue(0);
    const waits = await service.waitsForAll();
    expect(Object.keys(waits)).toHaveLength(2);
    expect(waits['a1'].waitMinutes).toBe(3); // 1 ciclo mínimo
  });
});
