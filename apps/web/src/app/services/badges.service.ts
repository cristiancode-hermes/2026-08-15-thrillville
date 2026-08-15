import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { BadgeView, CheckInView, PuntosView } from '../models';

@Injectable({ providedIn: 'root' })
export class BadgeService {
  constructor(private readonly api: ApiService) {}

  catalogo(): Promise<BadgeView[]> {
    return this.api.get<BadgeView[]>('/insignias');
  }

  puntos(): Promise<PuntosView> {
    return this.api.get<PuntosView>('/me/puntos');
  }

  ganadas(): Promise<BadgeView[]> {
    return this.api.get<BadgeView[]>('/me/insignias');
  }

  historial(): Promise<CheckInView[]> {
    return this.api.get<CheckInView[]>('/me/check-ins');
  }
}
