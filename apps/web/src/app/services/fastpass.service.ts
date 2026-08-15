import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import type { FastPassView, SlotView } from '../models';

@Injectable({ providedIn: 'root' })
export class FastPassService {
  constructor(private readonly api: ApiService) {}

  slots(atraccionId: string, fecha: string): Promise<SlotView[]> {
    return this.api.get<SlotView[]>('/fastpass/slots', { atraccionId, fecha });
  }

  reservar(atraccionId: string, fecha: string, horaInicio: string): Promise<{ fastpass: FastPassView; expiresAt: string }> {
    return this.api.post('/fastpass', { atraccionId, fecha, horaInicio });
  }

  confirmar(id: number): Promise<{ fastpass: FastPassView; qrSvg: string }> {
    return this.api.post(`/fastpass/${id}/confirmar`);
  }

  cancelar(id: number): Promise<{ fastpass: FastPassView }> {
    return this.api.post(`/fastpass/${id}/cancelar`);
  }

  usar(id: number): Promise<{ fastpass: FastPassView; checkIn: unknown; puntos: number; nuevaInsignia: unknown }> {
    return this.api.post(`/fastpass/${id}/usar`);
  }

  checkInWalkup(atraccionId: string): Promise<{ checkIn: unknown; puntos: number; nuevaInsignia: unknown }> {
    return this.api.post('/fastpass/check-in', { atraccionId });
  }

  misReservas(): Promise<FastPassView[]> {
    return this.api.get<FastPassView[]>('/fastpass/mis-reservas');
  }

  get(id: number | string): Promise<{ fastpass: FastPassView; qrSvg: string }> {
    return this.api.get(`/fastpass/${id}`);
  }
}
