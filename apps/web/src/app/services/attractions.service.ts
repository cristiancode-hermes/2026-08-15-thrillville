import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { Attraction, WaitInfo, ZonaInfo } from '../models';

@Injectable({ providedIn: 'root' })
export class AttractionService {
  constructor(private readonly api: ApiService) {}

  list(filters?: { zona?: string; intensidad?: string; edadMin?: string; q?: string }): Promise<Attraction[]> {
    return this.api.get<Attraction[]>('/atracciones', filters ?? {});
  }

  get(id: string): Promise<Attraction> {
    return this.api.get<Attraction>(`/atracciones/${id}`);
  }

  wait(id: string): Promise<WaitInfo> {
    return this.api.get<WaitInfo>(`/atracciones/${id}/wait`);
  }

  zonas(): Promise<ZonaInfo[]> {
    return this.api.get<ZonaInfo[]>('/zonas');
  }
}
