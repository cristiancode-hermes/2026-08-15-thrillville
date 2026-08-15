import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attraction, CheckIn } from '../entities/entities';
import { WaitService } from './wait.service';
import type { Zona } from '../entities/entities';

@Injectable()
export class AttractionsService {
  constructor(
    @InjectRepository(Attraction) private readonly attrsRepo: Repository<Attraction>,
    @InjectRepository(CheckIn) private readonly checkInsRepo: Repository<CheckIn>,
    private readonly wait: WaitService,
  ) {}

  async findAll(filters: { zona?: string; intensidad?: string; edadMin?: string; q?: string }) {
    const qb = this.attrsRepo.createQueryBuilder('a').orderBy('a.name', 'ASC');
    if (filters.zona) qb.andWhere('a.zona = :zona', { zona: filters.zona });
    if (filters.intensidad) qb.andWhere('a.intensidad = :int', { int: Number(filters.intensidad) });
    if (filters.edadMin) qb.andWhere('a.edadMin <= :edad', { edad: Number(filters.edadMin) });
    if (filters.q) qb.andWhere('a.name LIKE :q', { q: `%${filters.q}%` });

    const attrs = await qb.getMany();
    const waits = await this.wait.waitsForAll();
    return attrs.map((a) => ({ ...a, wait: waits[a.id] ?? null }));
  }

  async findOne(id: string) {
    const attr = await this.attrsRepo.findOne({ where: { id } });
    if (!attr) throw new NotFoundException('Atracción no encontrada');
    const wait = await this.wait.waitFor(attr);
    return { ...attr, wait };
  }

  async getWait(id: string) {
    const attr = await this.attrsRepo.findOne({ where: { id } });
    if (!attr) throw new NotFoundException('Atracción no encontrada');
    return this.wait.waitFor(attr);
  }

  async zonas(): Promise<Array<{ zona: Zona; nombre: string; count: number }>> {
    const all = await this.attrsRepo.find();
    const nombres: Record<Zona, string> = {
      norte: 'Zona Norte',
      plaza: 'Plaza Central',
      aventura: 'Zona Aventura',
    };
    return (['norte', 'plaza', 'aventura'] as Zona[]).map((z) => ({
      zona: z,
      nombre: nombres[z],
      count: all.filter((a) => a.zona === z).length,
    }));
  }
}
