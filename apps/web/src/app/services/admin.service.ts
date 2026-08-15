import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { AdminKpis, Attraction, OcupacionPoint, VentasPoint } from '../models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly api: ApiService) {}

  kpis(): Promise<AdminKpis> {
    return this.api.get<AdminKpis>('/admin/kpis');
  }

  ocupacion(fecha?: string): Promise<OcupacionPoint[]> {
    return this.api.get<OcupacionPoint[]>('/admin/ocupacion', { fecha });
  }

  ventas(dias = 7): Promise<VentasPoint[]> {
    return this.api.get<VentasPoint[]>('/admin/ventas', { dias });
  }

  crearAtraccion(dto: Partial<Attraction>): Promise<Attraction> {
    return this.api.post('/admin/atracciones', dto);
  }

  actualizarAtraccion(id: string, dto: Partial<Attraction>): Promise<Attraction> {
    return this.api.patch(`/admin/atracciones/${id}`, dto);
  }

  cambiarEstado(id: string, estado: 'operativa' | 'saturada' | 'cerrada'): Promise<Attraction> {
    return this.api.patch(`/admin/atracciones/${id}/estado`, { estado });
  }

  eliminarAtraccion(id: string): Promise<{ ok: boolean }> {
    return this.api.delete(`/admin/atracciones/${id}`);
  }
}
